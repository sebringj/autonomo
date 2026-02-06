/**
 * @autonomo/core
 * 
 * Core library for Autonomo - AI-powered application testing.
 * 
 * This package provides:
 * - Element registration for interactive components
 * - Custom action definitions for complex operations
 * - State management for unified snapshots
 * - Command processing for AI control
 * - Transport utilities for HTTP/WebSocket communication
 */

// Registry - element tracking
export {
  registry,
  registerTapHandler,
  registerFillHandler,
  registerToggleHandler,
} from './registry.js';

export type {
  ElementType,
  ElementHandler,
  ElementInfo,
} from './registry.js';

// Actions - custom operations
export {
  customActions,
  registerCustomAction,
} from './actions.js';

export type {
  ActionResult,
  CustomActionHandler,
} from './actions.js';

// State - application state tracking
export {
  state,
} from './state.js';

export type {
  UserContext,
  AppState,
  NetworkRequest,
} from './state.js';

// Instance - unique identity per app window/process
export {
  initInstance,
  getInstance,
  requireInstance,
  getBridgeId,
  resetInstance,
} from './instance.js';

export type {
  InstanceConfig,
  InstanceInfo,
} from './instance.js';

// Commands - AI control interface
export {
  setNavigationHandler,
  navigate,
  press,
  fill,
  submit,
  custom,
  wait,
  getState,
  executeCommand,
} from './commands.js';

export type {
  CommandResult,
  NavigationHandler,
} from './commands.js';

// Transport - HTTP/WebSocket server utilities
export {
  createHttpTransport,
  handleRequest,
  createFetchHandler,
} from './transport.js';

export type {
  TransportConfig,
  TransportInstance,
} from './transport.js';
