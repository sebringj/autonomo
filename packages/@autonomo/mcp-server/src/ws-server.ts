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
  elements: Array<{
    id: string;
    type: string;
    disabled?: boolean;
    value?: string;
    hint?: string;
  }>;
  customActions?: string[];
  user?: Record<string, unknown>;
  data?: Record<string, unknown>;
  errors?: string[];
  logs?: string[];
}

export interface BridgeConnection {
  id: string;
  name: string;
  platform: 'web' | 'mobile' | 'desktop' | 'unknown';
  ws: WebSocket;
  state: AppState | null;
  lastSeen: number;
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
  
  // Get state from a bridge
  getState(bridgeId: string): AppState | null;
  
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
            
            const connection: BridgeConnection = {
              id: bridgeId,
              name: msg.name || 'unknown',
              platform: msg.platform || 'unknown',
              ws,
              state: null,
              lastSeen: Date.now(),
            };
            
            bridges.set(bridgeId, connection);
            console.error(`🟢 Bridge connected: ${bridgeId} (${msg.platform || 'unknown'})`);
            emitter.emit('bridge:connect', bridgeId);
            
            // Send ack
            ws.send(JSON.stringify({ type: 'registered', bridgeId }));
            break;
          }
          
          case 'state': {
            // App is reporting its state
            if (bridgeId && bridges.has(bridgeId)) {
              const bridge = bridges.get(bridgeId)!;
              bridge.state = {
                screen: msg.screen || 'unknown',
                timestamp: Date.now(),
                elements: msg.elements || [],
                customActions: msg.customActions || [],
                user: msg.user,
                data: msg.data,
                errors: msg.errors || [],
                logs: msg.logs || [],
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
    }));
  };
  
  emitter.getState = (bridgeId: string): AppState | null => {
    const bridge = bridges.get(bridgeId);
    return bridge?.state || null;
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
        ...command,
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
