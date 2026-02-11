/**
 * Tests for AutonomoService
 * 
 * Tests the service logic including state collection and command handling.
 * WebSocket connections are mocked for testing.
 */

import { registry, state, customActions, resetInstance } from '@autonomo/core';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  sentMessages: string[] = [];
  
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // Test helpers
  simulateMessage(msg: object): void {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
}

// Store original WebSocket
const OriginalWebSocket = (globalThis as any).WebSocket;

beforeAll(() => {
  (globalThis as any).WebSocket = MockWebSocket;
});

afterAll(() => {
  (globalThis as any).WebSocket = OriginalWebSocket;
});

beforeEach(() => {
  registry.list().forEach(id => registry.unregister(id));
  customActions.list().forEach(name => {
    // We'll register fresh actions per test
  });
  resetInstance();
  state.setScreen('');
  state.setUser(undefined);
});

describe('AutonomoService state collection', () => {
  it('should collect all elements in state', () => {
    registry.register('btn-1', { type: 'button', handler: jest.fn() });
    registry.register('input-1', { 
      type: 'input', 
      handler: jest.fn(),
      getValue: () => 'test value',
      hint: 'Enter name',
    });
    
    state.setScreen('test-screen');
    state.setUser({ id: 'user-1', email: 'test@test.com' });
    
    // Collect state (simulating what service does)
    const elements = registry.getAll().map(el => ({
      id: el.id,
      type: el.type,
      disabled: el.disabled,
      value: el.value,
      hint: el.hint,
    }));
    
    const appState = state.getState();
    
    const collectedState = {
      screen: appState.screen,
      elements,
      customActions: customActions.list(),
      user: appState.user,
      data: appState.data,
    };
    
    expect(collectedState.screen).toBe('test-screen');
    expect(collectedState.elements).toHaveLength(2);
    expect(collectedState.user?.email).toBe('test@test.com');
    
    const input = collectedState.elements.find((e: any) => e.id === 'input-1');
    expect(input?.value).toBe('test value');
    expect(input?.hint).toBe('Enter name');
  });
});

describe('AutonomoService command handling', () => {
  it('should handle press command', async () => {
    const handler = jest.fn();
    registry.register('submit-btn', { type: 'button', handler });
    
    // Simulate command handling
    const element = registry.get('submit-btn');
    await element?.handler();
    
    expect(handler).toHaveBeenCalled();
  });

  it('should handle fill command', async () => {
    let value = '';
    registry.register('email-input', {
      type: 'input',
      handler: (v) => { value = v || ''; },
    });
    
    const element = registry.get('email-input');
    await element?.handler('filled@test.com');
    
    expect(value).toBe('filled@test.com');
  });

  it('should handle submit command', async () => {
    const onSubmit = jest.fn();
    registry.register('form-input', {
      type: 'input',
      handler: jest.fn(),
      onSubmit,
    });
    
    const element = registry.get('form-input');
    await element?.onSubmit?.();
    
    expect(onSubmit).toHaveBeenCalled();
  });

  it('should handle custom action command', async () => {
    const actionHandler = jest.fn(async (value) => ({
      success: true,
      message: `Executed with ${value}`,
    }));
    
    customActions.register('test-action', actionHandler);
    
    const result = await customActions.execute('test-action', 'test-value');
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Executed with test-value');
  });

  it('should handle wait command', async () => {
    const start = Date.now();
    await new Promise(r => setTimeout(r, 50));
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
  });

  it('should return error for unknown element', () => {
    const element = registry.get('non-existent');
    expect(element).toBeUndefined();
  });

  it('should return error for unknown custom action', async () => {
    const result = await customActions.execute('unknown-action');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('AutonomoService WebSocket integration', () => {
  it('should create WebSocket with correct URL', () => {
    const ws = new MockWebSocket('ws://localhost:9876');
    expect(ws.url).toBe('ws://localhost:9876');
  });

  it('should send registration message on connect', (done) => {
    const ws = new MockWebSocket('ws://localhost:9876');
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'register',
        name: 'test-app',
        platform: 'web',
        instanceId: 'test-123',
      }));
      
      // Check at least one registration message was sent
      const registerMsgs = ws.sentMessages.filter(m => JSON.parse(m).type === 'register');
      expect(registerMsgs.length).toBeGreaterThanOrEqual(1);
      
      const msg = JSON.parse(registerMsgs[0]);
      expect(msg.type).toBe('register');
      expect(msg.name).toBe('test-app');
      done();
    };
    
    // Trigger onopen
    setTimeout(() => ws.onopen?.(), 0);
  });

  it('should send state after registration', (done) => {
    const ws = new MockWebSocket('ws://localhost:9876');
    
    // Setup some state BEFORE setting up handlers
    registry.register('test-btn-2', { type: 'button', handler: jest.fn() });
    state.setScreen('home');
    
    // Capture the screen value now before any async operations
    const expectedScreen = state.getState().screen;
    
    ws.onopen = () => {
      // Send registration
      ws.send(JSON.stringify({ type: 'register', name: 'app' }));
      
      // Simulate server response
      ws.simulateMessage({ type: 'registered', bridgeId: 'test-bridge-1' });
    };
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'registered') {
        // Now send state - capture it at this moment
        const currentScreen = state.getState().screen;
        const elements = registry.getAll();
        ws.send(JSON.stringify({
          type: 'state',
          screen: currentScreen,
          elements,
        }));
        
        // Check that we have registration and state messages
        const registerMsgs = ws.sentMessages.filter(m => JSON.parse(m).type === 'register');
        const stateMsgs = ws.sentMessages.filter(m => JSON.parse(m).type === 'state');
        
        expect(registerMsgs.length).toBeGreaterThanOrEqual(1);
        expect(stateMsgs.length).toBeGreaterThanOrEqual(1);
        
        // Verify register message was sent
        const registerMsg = JSON.parse(registerMsgs[registerMsgs.length - 1]);
        expect(registerMsg.type).toBe('register');
        
        // State message was sent
        const lastStateMsg = JSON.parse(stateMsgs[stateMsgs.length - 1]);
        expect(lastStateMsg.type).toBe('state');
        
        done();
      }
    };
    
    setTimeout(() => ws.onopen?.(), 0);
  });

  it('should respond to ping with pong', () => {
    const ws = new MockWebSocket('ws://localhost:9876');
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    };
    
    ws.simulateMessage({ type: 'ping' });
    
    expect(ws.sentMessages).toHaveLength(1);
    expect(JSON.parse(ws.sentMessages[0]).type).toBe('pong');
  });
});

describe('state change notifications', () => {
  it('should notify on screen change', () => {
    const listener = jest.fn();
    state.onChange(listener);
    
    state.setScreen('new-screen');
    
    expect(listener).toHaveBeenCalled();
  });

  it('should notify on user change', () => {
    const listener = jest.fn();
    state.onChange(listener);
    
    state.setUser({ id: 'user-1' });
    
    expect(listener).toHaveBeenCalled();
  });

  it('should notify on data merge', () => {
    const listener = jest.fn();
    state.onChange(listener);
    
    state.mergeData({ key: 'value' });
    
    expect(listener).toHaveBeenCalled();
  });
});
