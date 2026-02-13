/**
 * Autonomo WebSocket Server
 * 
 * Apps connect directly to this WebSocket server instead of exposing HTTP endpoints.
 * Much simpler architecture - just "npm start" and apps connect.
 * 
 * Protocol:
 * 
 * App → Server:
 *   { type: "register", name: "my-app", platform: "web" }
 *   { type: "state", screen: "home", elements: [...], ... }
 *   { type: "result", commandId: "...", success: true, ... }
 * 
 * Server → App:
 *   { type: "command", id: "...", action: "press", target: "Button.ID" }
 *   { type: "ping" }
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

export interface AppState {
  screen: string;
  timestamp: number;
  /** Screen-level hint for AI agents */
  screenHint?: string;
  /** Suggested flow of actions for this screen */
  suggestedFlow?: Array<{
    action: string;
    target: string;
    value?: string;
    description?: string;
  }>;
  elements: Array<{
    id: string;
    type: string;
    disabled?: boolean;
    value?: string;
    hint?: string;
  }>;
  customActions?: Array<string | { name: string; description?: string; args?: Record<string, string> }>;
  user?: Record<string, unknown>;
  data?: Record<string, unknown>;
  errors?: string[];
  logs?: string[];
  /** 
   * Available routes for navigation validation.
   * If provided, navigation commands will be validated against this list.
   */
  availableRoutes?: string[];
}

export interface AIContext {
  /** Markdown instructions for AI about how to test this app */
  instructions?: string;
  /** Test credentials (phone, email, password, OTP codes, etc.) */
  credentials?: Record<string, string>;
  /** Available user roles to test */
  roles?: string[];
  /** Pre-defined login scenario */
  loginScenario?: Array<{
    action: string;
    target: string;
    value?: string;
    description?: string;
  }>;
  /** TestID naming convention description */
  testIdPattern?: string;
  /** Common validation scenarios */
  validationScenarios?: Record<string, Array<{
    action: string;
    target: string;
    value?: string;
  }>>;
}

export interface BridgeConnection {
  id: string;
  name: string;
  platform: 'web' | 'mobile' | 'desktop' | 'unknown';
  ws: WebSocket;
  state: AppState | null;
  lastSeen: number;
  /** AI context provided by the app */
  aiContext?: AIContext;
  pendingCommand?: {
    id: string;
    resolve: (result: CommandResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  };
}

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
  state: AppState;
}

export interface AutonomoWSServer extends EventEmitter {
  port: number;
  bridges: Map<string, BridgeConnection>;
  
  // Get list of connected bridges
  listBridges(): BridgeInfo[];
  
  // Get state from a bridge (cached)
  getState(bridgeId: string): AppState | null;
  
  // Request fresh state from a bridge (asks client to report current state)
  requestState(bridgeId: string, timeout?: number): Promise<AppState | null>;
  
  // Send command and wait for result
  sendCommand(bridgeId: string, command: Command): Promise<CommandResult>;
  
  // Close the server
  close(): void;
}

export interface BridgeInfo {
  id: string;
  name: string;
  platform: string;
  screen?: string;
  elements?: number;
  status: 'connected' | 'disconnected';
  lastSeen: number;
  /** Whether this bridge has AI context available */
  hasAiContext?: boolean;
}

export interface Command {
  action: 'navigate' | 'press' | 'fillIn' | 'fill' | 'submit' | 'custom' | 'wait';
  target?: string;
  value?: string;
}

const DEFAULT_PORT = 9876;
const COMMAND_TIMEOUT = 30000; // 30 seconds

/**
 * Create and start the WebSocket server
 */
export function createWSServer(port: number = DEFAULT_PORT): AutonomoWSServer {
  const bridges = new Map<string, BridgeConnection>();
  const emitter = new EventEmitter() as AutonomoWSServer;
  
  const wss = new WebSocketServer({ port });
  
  console.error(`🔌 Autonomo WebSocket server listening on ws://localhost:${port}`);
  
  wss.on('connection', (ws: WebSocket) => {
    let bridgeId: string | null = null;
    
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        
        switch (msg.type) {
          case 'register': {
            // App is registering itself
            const instanceId = msg.instanceId || Math.random().toString(36).slice(2, 10);
            bridgeId = `${msg.name || 'app'}-${instanceId}`;
            
            // Extract initial state if provided with registration
            let initialState: AppState | null = null;
            if (msg.state) {
              initialState = {
                screen: msg.state.screen || 'unknown',
                timestamp: Date.now(),
                elements: msg.state.elements || [],
                customActions: msg.state.customActions || [],
                user: msg.state.user,
                data: msg.state.data,
                errors: msg.state.errors || [],
                logs: msg.state.logs || [],
                availableRoutes: msg.state.availableRoutes || [],
              };
            }
            
            const connection: BridgeConnection = {
              id: bridgeId,
              name: msg.name || 'unknown',
              platform: msg.platform || 'unknown',
              ws,
              state: initialState,
              lastSeen: Date.now(),
              aiContext: msg.aiContext, // 👈 Capture AI context from registration
            };
            
            bridges.set(bridgeId, connection);
            const hasContext = msg.aiContext ? ' [has AI context]' : '';
            console.error(`🟢 Bridge connected: ${bridgeId} (${msg.platform || 'unknown'})${initialState ? ` on screen: ${initialState.screen}` : ''}${hasContext}`);
            emitter.emit('bridge:connect', bridgeId);
            
            // Send ack
            ws.send(JSON.stringify({ type: 'registered', bridgeId }));
            break;
          }
          
          case 'state':
          case 'stateUpdate': {
            // App is reporting its state (either initial or update)
            if (bridgeId && bridges.has(bridgeId)) {
              const bridge = bridges.get(bridgeId)!;
              const state = msg.state || msg; // stateUpdate wraps in .state, legacy puts at root
              bridge.state = {
                screen: state.screen || 'unknown',
                timestamp: Date.now(),
                elements: state.elements || [],
                customActions: state.customActions || [],
                user: state.user,
                data: state.data,
                errors: state.errors || [],
                logs: state.logs || [],
                availableRoutes: state.availableRoutes || [],
              };
              bridge.lastSeen = Date.now();
              emitter.emit('bridge:state', bridgeId, bridge.state);
            }
            break;
          }
          
          case 'result': {
            // App is reporting command result
            if (bridgeId && bridges.has(bridgeId)) {
              const bridge = bridges.get(bridgeId)!;
              bridge.lastSeen = Date.now();
              
              // Update state from result
              if (msg.state) {
                bridge.state = msg.state;
              }
              
              // Resolve pending command
              if (bridge.pendingCommand && bridge.pendingCommand.id === msg.commandId) {
                clearTimeout(bridge.pendingCommand.timeout);
                bridge.pendingCommand.resolve({
                  success: msg.success !== false,
                  message: msg.message,
                  error: msg.error,
                  state: bridge.state!,
                });
                bridge.pendingCommand = undefined;
              }
            }
            break;
          }
          
          case 'pong': {
            // Keepalive response
            if (bridgeId && bridges.has(bridgeId)) {
              bridges.get(bridgeId)!.lastSeen = Date.now();
            }
            break;
          }
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    });
    
    ws.on('close', () => {
      if (bridgeId && bridges.has(bridgeId)) {
        const bridge = bridges.get(bridgeId)!;
        
        // Reject any pending command
        if (bridge.pendingCommand) {
          clearTimeout(bridge.pendingCommand.timeout);
          bridge.pendingCommand.reject(new Error('Bridge disconnected'));
        }
        
        bridges.delete(bridgeId);
        console.error(`🔴 Bridge disconnected: ${bridgeId}`);
        emitter.emit('bridge:disconnect', bridgeId);
      }
    });
    
    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });
  
  // Ping all connections periodically
  const pingInterval = setInterval(() => {
    for (const [id, bridge] of bridges) {
      if (bridge.ws.readyState === WebSocket.OPEN) {
        bridge.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }
  }, 30000);
  
  // Implement the interface
  emitter.port = port;
  emitter.bridges = bridges;
  
  emitter.listBridges = (): BridgeInfo[] => {
    return Array.from(bridges.values()).map(b => ({
      id: b.id,
      name: b.name,
      platform: b.platform,
      screen: b.state?.screen,
      elements: b.state?.elements?.length,
      status: 'connected' as const,
      lastSeen: b.lastSeen,
      hasAiContext: !!b.aiContext,
    }));
  };
  
  // Get AI context for a bridge
  (emitter as any).getAiContext = (bridgeId: string): AIContext | null => {
    const bridge = bridges.get(bridgeId);
    return bridge?.aiContext || null;
  };
  
  emitter.getState = (bridgeId: string): AppState | null => {
    const bridge = bridges.get(bridgeId);
    return bridge?.state || null;
  };
  
  // Request fresh state from client (server-initiated polling)
  emitter.requestState = (bridgeId: string, timeout: number = 5000): Promise<AppState | null> => {
    return new Promise((resolve) => {
      const bridge = bridges.get(bridgeId);
      
      if (!bridge || bridge.ws.readyState !== WebSocket.OPEN) {
        resolve(null);
        return;
      }
      
      // Listen for next state update from this bridge
      const onState = (id: string, state: AppState) => {
        if (id === bridgeId) {
          emitter.removeListener('bridge:state', onState);
          clearTimeout(timeoutId);
          resolve(state);
        }
      };
      
      emitter.on('bridge:state', onState);
      
      const timeoutId = setTimeout(() => {
        emitter.removeListener('bridge:state', onState);
        // Return cached state on timeout
        resolve(bridge.state);
      }, timeout);
      
      // Ask client to report its current state
      bridge.ws.send(JSON.stringify({ type: 'requestState' }));
    });
  };
  
  /**
   * Check if a route matches available routes (supports glob patterns like /league/*)
   */
  const isRouteValid = (route: string, availableRoutes: string[]): boolean => {
    return availableRoutes.some(pattern => {
      // Exact match
      if (pattern === route) return true;
      
      // Glob pattern matching (e.g., /league/* matches /league/123)
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '$');
        return regex.test(route);
      }
      
      // Wildcard suffix (e.g., /league/** matches /league/123/settings)
      if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3);
        return route.startsWith(prefix);
      }
      
      return false;
    });
  };
  
  emitter.sendCommand = (bridgeId: string, command: Command): Promise<CommandResult> => {
    return new Promise((resolve, reject) => {
      const bridge = bridges.get(bridgeId);
      
      if (!bridge) {
        reject(new Error(`Bridge not found: ${bridgeId}`));
        return;
      }
      
      if (bridge.ws.readyState !== WebSocket.OPEN) {
        reject(new Error(`Bridge not connected: ${bridgeId}`));
        return;
      }
      
      // Transform custom action: action='custom', target='fillOtp' → action='fillOtp'
      let finalCommand = { ...command };
      if (command.action === 'custom' && command.target) {
        // Validate custom action exists
        const customActions = bridge.state?.customActions || [];
        const actionNames = customActions.map((ca: any) => typeof ca === 'string' ? ca : ca.name);
        if (!actionNames.includes(command.target)) {
          reject(new Error(`Unknown custom action: "${command.target}". Available: ${actionNames.join(', ') || 'none'}`));
          return;
        }
        // Remap: action becomes the custom action name, value stays as-is
        finalCommand = { action: command.target as any, value: command.value };
      }
      
      // Validate navigation routes if availableRoutes is provided
      if (finalCommand.action === 'navigate' && finalCommand.target && bridge.state?.availableRoutes?.length) {
        if (!isRouteValid(finalCommand.target, bridge.state.availableRoutes)) {
          reject(new Error(`Invalid route: "${finalCommand.target}". Available routes: ${bridge.state.availableRoutes.join(', ')}`));
          return;
        }
      }
      
      const commandId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      // Set up timeout
      const timeout = setTimeout(() => {
        if (bridge.pendingCommand?.id === commandId) {
          bridge.pendingCommand = undefined;
          reject(new Error('Command timeout'));
        }
      }, COMMAND_TIMEOUT);
      
      // Store pending command
      bridge.pendingCommand = { id: commandId, resolve, reject, timeout };
      
      // Send command to app
      bridge.ws.send(JSON.stringify({
        type: 'command',
        id: commandId,
        ...finalCommand,
      }));
    });
  };
  
  emitter.close = () => {
    clearInterval(pingInterval);
    wss.close();
  };
  
  return emitter;
}

// Singleton for use with MCP server
let serverInstance: AutonomoWSServer | null = null;

export function getWSServer(port?: number): AutonomoWSServer {
  if (!serverInstance) {
    serverInstance = createWSServer(port);
  }
  return serverInstance;
}

export function closeWSServer(): void {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
  }
}
