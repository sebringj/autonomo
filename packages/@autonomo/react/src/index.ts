/**
 * @autonomo/react
 * 
 * React hooks and components for Autonomo integration.
 */

import { createElement, useEffect, useRef, useCallback, useState, type CSSProperties } from 'react';
import {
  registry,
  state,
  customActions,
  registerTapHandler,
  registerFillHandler,
  registerToggleHandler,
  registerCustomAction,
  setNavigationHandler,
  initInstance,
  getInstance,
  type ElementType,
  type CustomActionHandler,
  type NavigationHandler,
  type InstanceConfig,
  type InstanceInfo,
} from '@autonomo/core';

export {
  registry,
  state,
  registerCustomAction,
  setNavigationHandler,
  // Instance management
  initInstance,
  getInstance,
  requireInstance,
  getBridgeId,
  resetInstance,
} from '@autonomo/core';

export type {
  ElementType,
  ElementHandler,
  ElementInfo,
  AppState,
  CommandResult,
  // Instance types
  InstanceConfig,
  InstanceInfo,
} from '@autonomo/core';

/**
 * Register a tap handler for a component
 * Automatically unregisters on unmount
 */
export function useTapHandler(
  id: string,
  handler: () => void | Promise<void>,
  options?: {
    disabled?: boolean;
    hint?: string;
    meta?: Record<string, unknown>;
  }
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return registerTapHandler(id, () => handlerRef.current(), options);
  }, [id, options?.disabled, options?.hint]);
}

/**
 * Register a fill handler for an input component
 * Automatically unregisters on unmount
 */
export function useFillHandler(
  id: string,
  handler: (value: string) => void | Promise<void>,
  options?: {
    getValue?: () => string;
    onSubmit?: () => void;
    disabled?: boolean;
    hint?: string;
    meta?: Record<string, unknown>;
  }
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return registerFillHandler(
      id,
      (value) => handlerRef.current(value),
      options
    );
  }, [id, options?.disabled, options?.hint]);
}

/**
 * Register a toggle handler for a switch/checkbox
 * Automatically unregisters on unmount
 */
export function useToggleHandler(
  id: string,
  handler: (value?: string) => void | Promise<void>,
  options?: {
    getValue?: () => string;
    disabled?: boolean;
    hint?: string;
    meta?: Record<string, unknown>;
  }
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return registerToggleHandler(
      id,
      (value) => handlerRef.current(value),
      options
    );
  }, [id, options?.disabled, options?.hint]);
}

/**
 * Register a custom action
 * Automatically unregisters on unmount
 */
export function useCustomAction(
  name: string,
  handler: CustomActionHandler
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return registerCustomAction(name, (value) => handlerRef.current(value));
  }, [name]);
}

/**
 * Set the current screen name
 */
export function useScreen(screen: string): void {
  useEffect(() => {
    state.setScreen(screen);
  }, [screen]);
}

/**
 * Set user context
 */
export function useUser(user: { id?: string; email?: string; role?: string } | undefined): void {
  useEffect(() => {
    state.setUser(user);
  }, [user?.id, user?.email, user?.role]);
}

/**
 * Set navigation handler for the app
 */
export function useNavigationHandler(handler: NavigationHandler): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    setNavigationHandler((screen) => handlerRef.current(screen));
  }, []);
}

/**
 * Hook to track app state data
 */
export function useAppData(data: Record<string, unknown>): void {
  useEffect(() => {
    state.mergeData(data);
  }, [JSON.stringify(data)]);
}

/**
 * Create a callback that triggers AI state refresh after execution
 */
export function useWithStateRefresh<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  return useCallback(
    ((...args) => {
      const result = callback(...args);
      // Trigger state notification after action
      setTimeout(() => state.notifyChange(), 50);
      return result;
    }) as T,
    [callback]
  );
}

/**
 * Initialize the Autonomo instance identity
 * 
 * Call once at app root (e.g., in App.tsx).
 * Each browser tab/window gets a unique instance ID.
 * 
 * @example
 * ```tsx
 * function App() {
 *   useInstance({ name: 'my-app', platform: 'web' });
 *   return <MyApp />;
 * }
 * ```
 */
export function useInstance(config: InstanceConfig): InstanceInfo | undefined {
  const [instance, setInstance] = useState<InstanceInfo | undefined>(undefined);

  useEffect(() => {
    // Only initialize once per app lifecycle
    const existing = getInstance();
    if (existing) {
      setInstance(existing);
    } else {
      const newInstance = initInstance(config);
      setInstance(newInstance);
      console.log(`[Autonomo] Instance initialized: ${newInstance.bridgeId}`);
    }
  }, []); // Empty deps - only run once

  return instance;
}

// ============================================================
// WebSocket Mode - Apps connect directly to Autonomo server
// ============================================================

interface UseAutonomoConfig {
  /** App name (used for bridge ID) */
  name: string;
  /** Platform type */
  platform?: 'web' | 'mobile' | 'desktop';
  /** Autonomo WebSocket server URL (default: ws://localhost:9876) */
  serverUrl?: string;
  /** Only enable in development (default: true) */
  devOnly?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

interface AutonomoConnection {
  /** Whether connected to the Autonomo server */
  connected: boolean;
  /** Current connection status */
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Last connection error (if any) */
  error: string | null;
  /** Bridge ID assigned by server */
  bridgeId: string | null;
  /** Send current state to server */
  reportState: () => void;
}

/**
 * Connect to Autonomo WebSocket server (RECOMMENDED)
 * 
 * This is the simplest way to integrate - just add this hook and Autonomo works.
 * No need to set up HTTP endpoints in your app.
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { connected, status } = useAutonomo({ name: 'my-app' });
 *   
 *   return (
 *     <div>
 *       <AutonomoDevBadge connected={connected} error={status === 'error'} />
 *       <MyApp />
 *     </div>
 *   );
 * }
 * ```
 */
export function useAutonomo(config: UseAutonomoConfig): AutonomoConnection {
  const { name, platform = 'web', serverUrl = 'ws://localhost:9876', devOnly = true, debug = false } = config;
  
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [bridgeId, setBridgeId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceIdRef = useRef<string>(Math.random().toString(36).slice(2, 10));
  
  // Check if we should skip (production mode with devOnly=true)
  // deno-lint-ignore no-explicit-any
  const nodeEnv = typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV;
  const shouldSkip = devOnly && nodeEnv === 'production';
  
  // Collect current state
  const collectState = useCallback(() => {
    const elements = registry.getAll().map(el => ({
      id: el.id,
      type: el.type,
      disabled: el.disabled,
      value: el.value,
      hint: el.hint,
    }));
    
    const appState = state.getState();
    
    return {
      screen: appState.screen,
      elements,
      customActions: customActions.list(),
      user: appState.user,
      data: appState.data,
      errors: appState.errors,
      logs: appState.logs,
    };
  }, []);
  
  // Report state to server
  const reportState = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const currentState = collectState();
      wsRef.current.send(JSON.stringify({ type: 'state', ...currentState }));
      if (debug) console.log('[Autonomo] State reported:', currentState.screen, currentState.elements.length, 'elements');
    }
  }, [collectState, debug]);
  
  // Handle incoming command
  const handleCommand = useCallback(async (msg: any) => {
    const { id, action, target, value } = msg;
    if (debug) console.log('[Autonomo] Command received:', action, target);
    
    let success = true;
    let error: string | undefined;
    let message: string | undefined;
    
    try {
      switch (action) {
        case 'navigate': {
          const navHandler = (state as any).navigationHandler;
          if (navHandler) {
            await navHandler(target);
            message = `Navigated to ${target}`;
          } else {
            error = 'No navigation handler registered';
            success = false;
          }
          break;
        }
        
        case 'press':
        case 'tap': {
          const element = registry.get(target);
          if (element?.handler) {
            await element.handler();
            message = `Pressed ${target}`;
          } else {
            error = `Element not found: ${target}`;
            success = false;
          }
          break;
        }
        
        case 'fillIn':
        case 'fill': {
          const element = registry.get(target);
          if (element?.handler) {
            await element.handler(value);
            message = `Filled ${target}`;
          } else {
            error = `Element not found: ${target}`;
            success = false;
          }
          break;
        }
        
        case 'submit': {
          const element = registry.get(target);
          if (element?.onSubmit) {
            await element.onSubmit();
            message = `Submitted ${target}`;
          } else {
            error = `Element has no submit handler: ${target}`;
            success = false;
          }
          break;
        }
        
        case 'custom': {
          if (customActions.has(target)) {
            const result = await customActions.execute(target, value);
            success = result.success;
            message = result.message;
            error = result.error;
          } else {
            error = `Custom action not found: ${target}`;
            success = false;
          }
          break;
        }
        
        case 'wait': {
          const ms = parseInt(target || '1000', 10);
          await new Promise(r => setTimeout(r, ms));
          message = `Waited ${ms}ms`;
          break;
        }
        
        default: {
          // Try as custom action (MCP server sends custom actions with action=actionName)
          if (customActions.has(action)) {
            const result = await customActions.execute(action, value || target);
            success = result.success;
            message = result.message;
            error = result.error;
          } else {
            error = `Unknown action: ${action}`;
            success = false;
          }
        }
      }
    } catch (err: any) {
      success = false;
      error = err.message || String(err);
    }
    
    // Wait a tick for state to update
    await new Promise(r => setTimeout(r, 50));
    
    // Send result with updated state
    const currentState = collectState();
    wsRef.current?.send(JSON.stringify({
      type: 'result',
      commandId: id,
      success,
      message,
      error,
      state: currentState,
    }));
  }, [collectState, debug]);
  
  // Connect to server
  useEffect(() => {
    // Skip in production if devOnly is true
    if (shouldSkip) {
      if (debug) console.log('[Autonomo] Skipped - production mode with devOnly=true');
      return;
    }
    
    let ws: WebSocket;
    
    const connect = () => {
      if (debug) console.log('[Autonomo] Connecting to', serverUrl);
      setStatus('connecting');
      setError(null);
      
      ws = new WebSocket(serverUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        if (debug) console.log('[Autonomo] Connected');
        
        // Register with server
        ws.send(JSON.stringify({
          type: 'register',
          name,
          platform,
          instanceId: instanceIdRef.current,
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          switch (msg.type) {
            case 'registered':
              setBridgeId(msg.bridgeId);
              setConnected(true);
              setStatus('connected');
              setError(null);
              if (debug) console.log('[Autonomo] Registered as', msg.bridgeId);
              // Send initial state
              reportState();
              break;
              
            case 'command':
              handleCommand(msg);
              break;
              
            case 'requestState':
              // Server is requesting fresh state for waitFor polling
              reportState();
              break;
              
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
          }
        } catch (err) {
          console.error('[Autonomo] Message parse error:', err);
        }
      };
      
      ws.onclose = () => {
        if (debug) console.log('[Autonomo] Disconnected');
        setConnected(false);
        setStatus('disconnected');
        setBridgeId(null);
        
        // Reconnect after delay
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };
      
      ws.onerror = (err: Event) => {
        const message = (err as unknown as { message?: string })?.message || 'WebSocket connection error';
        setError(message);
        setStatus('error');
        if (debug) console.error('[Autonomo] WebSocket error:', err);
      };
    };
    
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      ws?.close();
    };
  }, [serverUrl, name, platform, debug, shouldSkip, handleCommand, reportState]);
  
  // Auto-report state on registry/state changes
  useEffect(() => {
    if (shouldSkip) return;
    
    const unsubscribe = state.onChange(() => {
      reportState();
    });
    
    return () => unsubscribe();
  }, [reportState]);
  
  return { connected, status, error, bridgeId, reportState };
}

export type AutonomoBadgePlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface AutonomoBadgeProps {
  connected: boolean;
  error?: boolean;
  devOnly?: boolean;
  placement?: AutonomoBadgePlacement;
  offset?: number;
  size?: number;
  logoUrl?: string;
  style?: CSSProperties;
}

const AUTONOMO_BADGE_KEYFRAMES_ID = 'autonomo-dev-badge-keyframes';

function isProductionMode(): boolean {
  // deno-lint-ignore no-explicit-any
  const nodeEnv = typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV;
  return nodeEnv === 'production';
}

function ensureBadgeKeyframes(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(AUTONOMO_BADGE_KEYFRAMES_ID)) return;

  const style = document.createElement('style');
  style.id = AUTONOMO_BADGE_KEYFRAMES_ID;
  style.textContent = `
@keyframes autonomoBadgePulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}
`;
  document.head.appendChild(style);
}

function getPlacementStyle(placement: AutonomoBadgePlacement, offset: number): CSSProperties {
  switch (placement) {
    case 'top-left':
      return { top: offset, left: offset };
    case 'bottom-left':
      return { bottom: offset, left: offset };
    case 'bottom-right':
      return { bottom: offset, right: offset };
    default:
      return { top: offset, right: offset };
  }
}

/**
 * Tiny branded floating status badge for development only.
 *
 * - Gray border: disconnected
 * - Green border + ✓ pulse: connected
 * - Red border + × pulse: error
 */
export function AutonomoDevBadge({
  connected,
  error = false,
  devOnly = true,
  placement = 'bottom-right',
  offset = 10,
  size = 30,
  logoUrl = 'https://raw.githubusercontent.com/sebringj/autonomo/main/logo.png',
  style,
}: AutonomoBadgeProps): ReturnType<typeof createElement> | null {
  useEffect(() => {
    ensureBadgeKeyframes();
  }, []);

  if (devOnly && isProductionMode()) {
    return null;
  }

  const mode = error ? 'error' : connected ? 'connected' : 'disconnected';
  const borderColor = mode === 'connected' ? '#16a34a' : mode === 'error' ? '#dc2626' : '#6b7280';
  const dotBackground = mode === 'connected' ? '#16a34a' : mode === 'error' ? '#dc2626' : '#9ca3af';
  const statusGlyph = mode === 'connected' ? '✓' : mode === 'error' ? '×' : '•';

  const badgeStyle: CSSProperties = {
    position: 'fixed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    borderRadius: 999,
    border: `1.5px solid ${borderColor}`,
    background: 'rgba(0,0,0,0.68)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999,
    boxSizing: 'border-box',
    ...getPlacementStyle(placement, offset),
    ...style,
  };

  const logoStyle: CSSProperties = {
    width: Math.max(10, Math.round(size * 0.56)),
    height: Math.max(10, Math.round(size * 0.56)),
    objectFit: 'contain',
    display: 'block',
    opacity: mode === 'disconnected' ? 0.8 : 1,
    filter: mode === 'disconnected' ? 'grayscale(0.5)' : 'none',
    pointerEvents: 'none',
  };

  const dotSize = Math.max(9, Math.round(size * 0.4));
  const dotStyle: CSSProperties = {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: dotSize,
    height: dotSize,
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.7)',
    background: dotBackground,
    color: '#ffffff',
    fontSize: Math.max(8, Math.round(size * 0.28)),
    lineHeight: `${dotSize - 2}px`,
    textAlign: 'center',
    fontWeight: 700,
    animation: mode === 'disconnected' ? undefined : 'autonomoBadgePulse 1.2s ease-in-out infinite',
    pointerEvents: 'none',
  };

  return createElement(
    'div',
    {
      style: badgeStyle,
      'aria-hidden': true,
      title: `Autonomo ${mode}`,
    },
    createElement('img', { src: logoUrl, alt: '', style: logoStyle }),
    createElement('span', { style: dotStyle }, statusGlyph)
  );
}
