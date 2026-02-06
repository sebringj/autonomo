/**
 * State Manager - Tracks and reports application state
 * 
 * Collects state from multiple sources into a unified snapshot
 * that the AI can use to understand the application.
 */

import type { ElementInfo } from './registry.js';
import { registry } from './registry.js';
import { customActions } from './actions.js';
import { getInstance, type InstanceInfo } from './instance.js';

export interface UserContext {
  id?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AppState {
  /** Current screen/route name */
  screen: string;
  /** Timestamp of this state snapshot */
  timestamp: number;
  /** Instance identity (if initialized) */
  instance?: InstanceInfo;
  /** User context if logged in */
  user?: UserContext;
  /** Registered interactive elements */
  elements: ElementInfo[];
  /** Available custom actions */
  customActions: string[];
  /** Application-specific data */
  data?: Record<string, unknown>;
  /** Recent errors */
  errors: string[];
  /** Recent console logs */
  logs: string[];
  /** Render/component errors */
  renderErrors: string[];
  /** Network requests (if tracked) */
  network?: NetworkRequest[];
}

export interface NetworkRequest {
  method: string;
  url: string;
  status?: number;
  duration?: number;
  error?: string;
}

type StateChangeListener = (state: AppState) => void;

class StateManager {
  private screen = 'unknown';
  private user: UserContext | undefined;
  private data: Record<string, unknown> = {};
  private errors: string[] = [];
  private logs: string[] = [];
  private renderErrors: string[] = [];
  private network: NetworkRequest[] = [];
  private listeners = new Set<StateChangeListener>();

  private maxErrors = 50;
  private maxLogs = 100;
  private maxNetwork = 50;

  /**
   * Set current screen/route
   */
  setScreen(screen: string): void {
    this.screen = screen;
    this.notifyChange();
  }

  /**
   * Get current screen
   */
  getScreen(): string {
    return this.screen;
  }

  /**
   * Set user context
   */
  setUser(user: UserContext | undefined): void {
    this.user = user;
    this.notifyChange();
  }

  /**
   * Set application data
   */
  setData(data: Record<string, unknown>): void {
    this.data = data;
    this.notifyChange();
  }

  /**
   * Merge data into existing
   */
  mergeData(data: Record<string, unknown>): void {
    this.data = { ...this.data, ...data };
    this.notifyChange();
  }

  /**
   * Add an error
   */
  addError(error: string): void {
    this.errors.push(error);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
    this.notifyChange();
  }

  /**
   * Add a log entry
   */
  addLog(log: string): void {
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Add a render error
   */
  addRenderError(error: string): void {
    this.renderErrors.push(error);
    if (this.renderErrors.length > this.maxErrors) {
      this.renderErrors = this.renderErrors.slice(-this.maxErrors);
    }
    this.notifyChange();
  }

  /**
   * Add a network request
   */
  addNetworkRequest(request: NetworkRequest): void {
    this.network.push(request);
    if (this.network.length > this.maxNetwork) {
      this.network = this.network.slice(-this.maxNetwork);
    }
  }

  /**
   * Clear errors
   */
  clearErrors(): void {
    this.errors = [];
    this.renderErrors = [];
    this.notifyChange();
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Clear network history
   */
  clearNetwork(): void {
    this.network = [];
  }

  /**
   * Get current state snapshot
   */
  getState(): AppState {
    return {
      screen: this.screen,
      timestamp: Date.now(),
      instance: getInstance(),
      user: this.user,
      elements: registry.getAll(),
      customActions: customActions.list(),
      data: this.data,
      errors: [...this.errors],
      logs: [...this.logs],
      renderErrors: [...this.renderErrors],
      network: this.network.length > 0 ? [...this.network] : undefined,
    };
  }

  /**
   * Subscribe to state changes
   */
  onChange(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Trigger a state update notification
   */
  notifyChange(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}

// Singleton instance
export const state = new StateManager();

// Set up registry change forwarding
registry.onChange(() => state.notifyChange());
customActions.onChange(() => state.notifyChange());
