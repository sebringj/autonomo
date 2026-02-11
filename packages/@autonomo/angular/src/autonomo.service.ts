/**
 * @autonomo/angular - AutonomoService
 * 
 * Main service for Autonomo integration in Angular applications.
 * Handles WebSocket connection, state management, and command processing.
 */

import { Injectable, signal, computed, NgZone, inject } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  registry,
  state,
  customActions,
  initInstance,
  getInstance,
  type InstanceConfig,
  type InstanceInfo,
} from '@autonomo/core';

export interface AutonomoConfig {
  /** App name (used for bridge ID) */
  name: string;
  /** Platform type */
  platform?: 'web' | 'mobile' | 'desktop';
  /** Autonomo WebSocket server URL (default: ws://localhost:9876) */
  serverUrl?: string;
  /** Enable debug logging */
  debug?: boolean;
}

export interface AutonomoConnection {
  /** Whether connected to the Autonomo server */
  connected: boolean;
  /** Bridge ID assigned by server */
  bridgeId: string | null;
}

@Injectable()
export class AutonomoService implements OnDestroy {
  private ngZone = inject(NgZone);
  
  // Connection state
  private _connected = new BehaviorSubject<boolean>(false);
  private _bridgeId = new BehaviorSubject<string | null>(null);
  
  // Observables
  readonly connected$ = this._connected.asObservable();
  readonly bridgeId$ = this._bridgeId.asObservable();
  
  // Signals for Angular 16+
  readonly connected = signal(false);
  readonly bridgeId = signal<string | null>(null);
  
  // WebSocket management
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private instanceId = Math.random().toString(36).slice(2, 10);
  private config: AutonomoConfig | null = null;
  private destroyed$ = new Subject<void>();
  private instance: InstanceInfo | undefined;

  /**
   * Initialize Autonomo with the given configuration.
   * Call this once in your root component or APP_INITIALIZER.
   */
  init(config: AutonomoConfig): void {
    this.config = config;
    
    // Initialize instance identity
    const existing = getInstance();
    if (existing) {
      this.instance = existing;
    } else {
      this.instance = initInstance({
        name: config.name,
        platform: config.platform || 'web',
      });
      if (config.debug) {
        console.log(`[Autonomo] Instance initialized: ${this.instance.bridgeId}`);
      }
    }
    
    // Connect to WebSocket server
    this.connect();
  }

  private connect(): void {
    if (!this.config) return;
    
    const { serverUrl = 'ws://localhost:9876', debug, name, platform = 'web' } = this.config;
    
    if (debug) console.log('[Autonomo] Connecting to', serverUrl);
    
    this.ws = new WebSocket(serverUrl);
    
    this.ws.onopen = () => {
      if (debug) console.log('[Autonomo] Connected');
      
      // Register with server
      this.ws?.send(JSON.stringify({
        type: 'register',
        name,
        platform,
        instanceId: this.instanceId,
      }));
    };
    
    this.ws.onmessage = (event) => {
      this.ngZone.run(() => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (err) {
          console.error('[Autonomo] Message parse error:', err);
        }
      });
    };
    
    this.ws.onclose = () => {
      if (this.config?.debug) console.log('[Autonomo] Disconnected');
      this.updateConnectionState(false, null);
      
      // Reconnect after delay
      this.reconnectTimeout = setTimeout(() => this.connect(), 2000);
    };
    
    this.ws.onerror = (err) => {
      if (this.config?.debug) console.error('[Autonomo] WebSocket error:', err);
    };
  }

  private handleMessage(msg: any): void {
    switch (msg.type) {
      case 'registered':
        this.updateConnectionState(true, msg.bridgeId);
        if (this.config?.debug) console.log('[Autonomo] Registered as', msg.bridgeId);
        this.reportState();
        break;
        
      case 'command':
        this.handleCommand(msg);
        break;
        
      case 'ping':
        this.ws?.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  private async handleCommand(msg: any): Promise<void> {
    const { id, action, target, value } = msg;
    if (this.config?.debug) console.log('[Autonomo] Command received:', action, target);
    
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
          // Try as custom action
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
    const currentState = this.collectState();
    this.ws?.send(JSON.stringify({
      type: 'result',
      commandId: id,
      success,
      message,
      error,
      state: currentState,
    }));
  }

  private collectState(): any {
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
  }

  private updateConnectionState(connected: boolean, bridgeId: string | null): void {
    this._connected.next(connected);
    this._bridgeId.next(bridgeId);
    this.connected.set(connected);
    this.bridgeId.set(bridgeId);
  }

  /**
   * Report current state to the server.
   * Called automatically on state changes, but can be called manually.
   */
  reportState(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const currentState = this.collectState();
      this.ws.send(JSON.stringify({ type: 'state', ...currentState }));
      if (this.config?.debug) {
        console.log('[Autonomo] State reported:', currentState.screen, currentState.elements.length, 'elements');
      }
    }
  }

  /**
   * Set the current screen name for state reporting.
   */
  setScreen(screen: string): void {
    state.setScreen(screen);
    this.reportState();
  }

  /**
   * Set the current user context.
   */
  setUser(user: { id?: string; email?: string; role?: string } | undefined): void {
    state.setUser(user);
    this.reportState();
  }

  /**
   * Merge additional data into app state.
   */
  mergeData(data: Record<string, unknown>): void {
    state.mergeData(data);
    this.reportState();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.ws?.close();
  }
}
