/**
 * @autonomo/react-native
 * 
 * React Native integration for Autonomo with Expo support.
 * 
 * This package provides:
 * - All hooks from @autonomo/react
 * - WebSocket MCP client for connecting to Autonomo server
 * - Expo-compatible host detection for simulators/emulators
 */

// Re-export all React hooks (includes useInstance)
export * from '@autonomo/react';

export {
  handleRequest,
  createFetchHandler,
} from '@autonomo/core';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';
import { handleRequest, getInstance, initInstance, registry, type InstanceInfo } from '@autonomo/core';

// Try to import expo-constants (optional peer dependency)
let ExpoConstants: { expoConfig?: { hostUri?: string }; manifest?: { debuggerHost?: string } } | null = null;
try {
  ExpoConstants = require('expo-constants').default;
} catch {
  // expo-constants not available
}

/**
 * Default Autonomo MCP server port
 */
const DEFAULT_MCP_PORT = 9876;

/**
 * Get the host machine's IP address for WebSocket connections.
 * 
 * In React Native, `localhost` doesn't work from the device/simulator
 * because it refers to the device itself, not the dev machine.
 * 
 * This function detects the correct host by:
 * 1. Using Expo's debuggerHost/hostUri (extracts IP from Metro bundler)
 * 2. Falling back to localhost (works on iOS simulator only)
 * 
 * @param fallbackHost - Optional fallback host if auto-detection fails
 * @returns The host address (IP or hostname)
 */
export function getDevHost(fallbackHost?: string): string {
  // Try Expo's hostUri first (newer Expo versions)
  const hostUri = ExpoConstants?.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost') {
      return host;
    }
  }
  
  // Try Expo's debuggerHost (older Expo versions)
  const debuggerHost = ExpoConstants?.manifest?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    if (host && host !== 'localhost') {
      return host;
    }
  }
  
  // Use fallback or localhost
  return fallbackHost ?? 'localhost';
}

/**
 * Get the full WebSocket URL for the Autonomo MCP server
 * 
 * @param port - MCP server port (default: 9876)
 * @param host - Optional host override
 * @returns WebSocket URL like ws://192.168.1.100:9876
 */
export function getMcpServerUrl(port: number = DEFAULT_MCP_PORT, host?: string): string {
  const resolvedHost = host ?? getDevHost();
  return `ws://${resolvedHost}:${port}`;
}

/**
 * Custom action metadata for AI discoverability
 */
export interface CustomActionInfo {
  /** Action name (e.g., 'fillOtp') */
  name: string;
  /** Human-readable description of what the action does */
  description?: string;
  /** Argument schema: { argName: 'type description' } */
  args?: Record<string, string>;
  /** Example usage */
  example?: { value?: string };
}

/**
 * Suggested action in a flow
 */
export interface SuggestedAction {
  /** Action to perform: press, fillIn, navigate, custom */
  action: string;
  /** Target element ID or route */
  target: string;
  /** Optional value for fillIn or custom actions */
  value?: string;
  /** Human-readable description of this step */
  description?: string;
}

/**
 * App state for reporting to MCP server
 */
export interface AppState {
  screen: string;
  /** 
   * Screen-level hint for AI agents.
   * Provides context about what this screen is for and how to use it.
   */
  screenHint?: string;
  /** 
   * Suggested flow of actions for this screen.
   * Helps AI understand the typical workflow.
   */
  suggestedFlow?: SuggestedAction[];
  elements: Array<{
    id: string;
    type: string;
    label?: string;
    disabled?: boolean;
    hint?: string;
  }>;
  /** 
   * Available custom actions with metadata.
   * Can be simple strings for backwards compatibility, or rich objects with schema.
   */
  customActions?: Array<string | CustomActionInfo>;
  errors?: Array<{ message: string; timestamp: number }>;
  user?: {
    id?: string;
    name?: string;
    role?: string;
  } | null;
  /** 
   * Available routes for navigation validation.
   * If provided, AI agents will only navigate to these routes.
   * Use glob patterns like '/league/*' for dynamic routes.
   */
  availableRoutes?: string[];
}

/**
 * Command from MCP server
 */
export interface McpCommand {
  commandId: string;
  action: string;
  target?: string;
  value?: string;
}

/**
 * Command result to send back to MCP server
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Configuration for the MCP WebSocket client
 */
export interface McpClientConfig {
  /** App name for bridge identification */
  name: string;
  /** MCP server port (default: 9876) */
  port?: number;
  /** MCP server host (auto-detected if not provided) */
  host?: string;
  /** Only enable in development (default: true) */
  devOnly?: boolean;
  /** Reconnect delay in ms (default: 5000) */
  reconnectDelay?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Get current app state - called when server requests state */
  getState: () => AppState;
  /** Handle command from server */
  onCommand: (command: McpCommand) => Promise<CommandResult>;
  /** Called when connected */
  onConnect?: (bridgeId: string) => void;
  /** Called when disconnected */
  onDisconnect?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

/**
 * Hook to connect to Autonomo MCP server via WebSocket
 * 
 * This hook manages a persistent WebSocket connection to the MCP server,
 * automatically handling:
 * - Host detection for Expo (extracts IP from Metro bundler)
 * - Reconnection on disconnect
 * - State reporting
 * - Command handling
 * 
 * @example
 * ```tsx
 * const { isConnected, bridgeId } = useAutonomoMcp({
 *   name: 'my-app',
 *   getState: () => ({
 *     screen: currentScreen,
 *     elements: getRegisteredElements(),
 *   }),
 *   onCommand: async (cmd) => {
 *     if (cmd.action === 'tap' && cmd.target) {
 *       await tapElement(cmd.target);
 *       return { success: true };
 *     }
 *     return { success: false, error: 'Unknown action' };
 *   },
 * });
 * ```
 */
export function useAutonomoMcp(config: McpClientConfig): {
  isConnected: boolean;
  bridgeId: string | null;
  serverUrl: string;
  reportState: () => void;
} {
  const {
    name,
    port = DEFAULT_MCP_PORT,
    host,
    devOnly = true,
    reconnectDelay = 5000,
    debug = false,
    getState,
    onCommand,
    onConnect,
    onDisconnect,
    onError,
  } = config;

  const [isConnected, setIsConnected] = useState(false);
  const [bridgeId, setBridgeId] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceIdRef = useRef<string>(Math.random().toString(36).slice(2, 10));
  
  const serverUrl = getMcpServerUrl(port, host);

  // Report state to server
  const reportState = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const state = getState();
      wsRef.current.send(JSON.stringify({
        type: 'stateUpdate',
        state,
      }));
      if (debug) console.log('[Autonomo] State reported:', state.screen);
    }
  }, [getState, debug]);

  // Connect to MCP server
  const connect = useCallback(() => {
    // Only run in dev mode if devOnly is true
    if (devOnly && typeof __DEV__ !== 'undefined' && !__DEV__) {
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (debug) console.log('[Autonomo] Connecting to MCP at', serverUrl);

    const ws = new WebSocket(serverUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (debug) console.log('[Autonomo] MCP connected');
      
      // Register with server
      ws.send(JSON.stringify({
        type: 'register',
        name,
        platform: 'mobile',
        instanceId: instanceIdRef.current,
        state: getState(),
      }));
    };

    ws.onmessage = async (event) => {
      if (!event.data) return;

      try {
        const msg = JSON.parse(event.data as string);

        switch (msg.type) {
          case 'registered':
            if (debug) console.log('[Autonomo] Registered as', msg.bridgeId);
            setBridgeId(msg.bridgeId);
            setIsConnected(true);
            onConnect?.(msg.bridgeId);
            break;

          case 'command': {
            // Note: MCP server sends 'id', not 'commandId'
            const commandId = msg.id || msg.commandId;
            const result = await onCommand({
              commandId,
              action: msg.action,
              target: msg.target,
              value: msg.value,
            });
            
            // Send result back (server expects type: 'result')
            ws.send(JSON.stringify({
              type: 'result',
              commandId,
              success: result.success,
              message: result.message,
              error: result.error,
              state: getState(),
            }));
            break;
          }

          case 'getState':
            ws.send(JSON.stringify({
              type: 'state',
              requestId: msg.requestId,
              state: getState(),
            }));
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (e) {
        if (debug) console.error('[Autonomo] Parse error:', e);
      }
    };

    ws.onclose = () => {
      if (debug) console.log('[Autonomo] MCP disconnected');
      wsRef.current = null;
      setIsConnected(false);
      setBridgeId(null);
      onDisconnect?.();

      // Reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectDelay);
    };

    ws.onerror = (error) => {
      if (debug) console.log('[Autonomo] MCP not available');
      onError?.(new Error('WebSocket connection failed'));
    };
  }, [serverUrl, name, devOnly, reconnectDelay, debug, getState, onCommand, onConnect, onDisconnect, onError]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Auto-report state when registry changes (elements added/removed)
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    const unsubscribe = registry.onChange(() => {
      // Debounce to avoid flooding on rapid changes (e.g., screen transitions)
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        reportState();
      }, 50);
    });
    
    return () => {
      unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [reportState]);

  return { isConnected, bridgeId, serverUrl, reportState };
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
