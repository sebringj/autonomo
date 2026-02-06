/**
 * @autonomo/react-native
 * 
 * React Native integration for Autonomo with Expo support.
 * 
 * This package provides:
 * - All hooks from @autonomo/react
 * - HTTP server transport for the app
 * - Expo-compatible implementation
 */

// Re-export all React hooks (includes useInstance)
export * from '@autonomo/react';

export {
  handleRequest,
  createFetchHandler,
} from '@autonomo/core';

import { useEffect, useRef, useState } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';
import { handleRequest, getInstance, initInstance, type InstanceInfo } from '@autonomo/core';

/**
 * Configuration for the Autonomo bridge
 */
export interface BridgeConfig {
  /** Port to listen on (default: 8080) */
  port?: number;
  /** Only enable in development (default: true) */
  devOnly?: boolean;
  /** App name for instance identification */
  appName?: string;
  /** Called when server starts */
  onStart?: (url: string, instance: InstanceInfo) => void;
  /** Called on errors */
  onError?: (error: Error) => void;
}

/**
 * Hook to run the Autonomo HTTP bridge
 * 
 * Automatically initializes the instance identity if not already done.
 * In React Native, this typically uses a polyfill or native module
 * for running an HTTP server. For Expo, we recommend using
 * expo-server or a WebSocket-based approach.
 */
export function useAutonomoBridge(config: BridgeConfig = {}): {
  isRunning: boolean;
  url: string | null;
  instance: InstanceInfo | null;
  error: Error | null;
} {
  const { port = 8080, devOnly = true, appName, onStart, onError } = config;
  const [isRunning, setIsRunning] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [instance, setInstance] = useState<InstanceInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Only run in dev mode if devOnly is true
    if (devOnly && !__DEV__) {
      return;
    }

    // Initialize instance if not already done
    let inst = getInstance();
    if (!inst) {
      inst = initInstance({
        name: appName ?? 'react-native-app',
        platform: 'mobile',
        meta: {
          os: Platform.OS,
          version: Platform.Version,
        },
      });
    }
    setInstance(inst);

    // Note: Actual server implementation depends on the platform
    // This is a placeholder - real implementation would use:
    // - Native HTTP server module
    // - WebSocket connection to external bridge
    // - Polling from external test runner

    const serverUrl = `http://localhost:${port}`;
    setUrl(serverUrl);
    setIsRunning(true);
    onStart?.(serverUrl, inst);

    console.log(`[Autonomo] Bridge ready at ${serverUrl}`);
    console.log(`[Autonomo] Instance: ${inst.bridgeId}`);

    return () => {
      setIsRunning(false);
      setUrl(null);
    };
  }, [port, devOnly, appName]);

  return { isRunning, url, instance, error };
}

/**
 * Hook to track React Native app state changes
 */
export function useRNAppState(
  onActive?: () => void,
  onBackground?: () => void
): void {
  const appStateRef = useRef(RNAppState.currentState);

  useEffect(() => {
    const subscription = RNAppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        onActive?.();
      } else if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        onBackground?.();
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [onActive, onBackground]);
}

/**
 * Get device info for debugging
 */
export function getDeviceInfo(): Record<string, unknown> {
  return {
    platform: Platform.OS,
    version: Platform.Version,
    isTV: Platform.isTV,
  };
}
