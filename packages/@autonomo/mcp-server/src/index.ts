/**
 * Autonomo MCP Server
 * 
 * WebSocket-based MCP server for AI assistants to control applications.
 * Works with GitHub Copilot, Claude Code, Cursor, and any MCP-compatible AI.
 */

export { startWSModeServer, type WSModeConfig } from './ws-mode.js';
export { 
  getWSServer, 
  closeWSServer,
  type AutonomoWSServer, 
  type AppState, 
  type BridgeConnection,
  type CommandResult,
  type Command,
  type AIContext,
} from './ws-server.js';

