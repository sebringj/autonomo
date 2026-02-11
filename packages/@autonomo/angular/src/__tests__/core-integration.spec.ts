/**
 * Tests for @autonomo/angular
 * 
 * Tests the core integration logic of the Angular package.
 */

import { registry, state, customActions, resetInstance } from '@autonomo/core';

// Reset state between tests
beforeEach(() => {
  // Clear registry
  registry.list().forEach(id => registry.unregister(id));
  
  // Clear custom actions
  customActions.list().forEach(name => {
    // Custom actions don't have a public unregister, so we test registration fresh
  });
  
  // Reset instance
  resetInstance();
  
  // Reset state
  state.setScreen('');
  state.setUser(undefined);
});

describe('@autonomo/angular core integration', () => {
  describe('registry operations', () => {
    it('should register and unregister tap handlers', () => {
      const handler = jest.fn();
      
      const unregister = registry.register('test-btn', {
        type: 'button',
        handler,
      });
      
      expect(registry.has('test-btn')).toBe(true);
      expect(registry.list()).toContain('test-btn');
      
      const element = registry.get('test-btn');
      expect(element).toBeDefined();
      expect(element?.type).toBe('button');
      
      // Invoke handler
      element?.handler();
      expect(handler).toHaveBeenCalled();
      
      // Unregister
      unregister();
      expect(registry.has('test-btn')).toBe(false);
    });

    it('should register fill handlers with getValue', () => {
      let inputValue = '';
      const handler = jest.fn((value: string) => { inputValue = value; });
      const getValue = jest.fn(() => inputValue);
      
      registry.register('email-input', {
        type: 'input',
        handler,
        getValue,
      });
      
      const element = registry.get('email-input');
      expect(element?.type).toBe('input');
      
      // Fill the input
      element?.handler('test@example.com');
      expect(handler).toHaveBeenCalledWith('test@example.com');
      expect(inputValue).toBe('test@example.com');
      
      // Get value
      expect(element?.getValue?.()).toBe('test@example.com');
    });

    it('should register toggle handlers', () => {
      let checked = false;
      const handler = jest.fn(() => { checked = !checked; });
      const getValue = jest.fn(() => String(checked));
      
      registry.register('terms-toggle', {
        type: 'toggle',
        handler,
        getValue,
      });
      
      const element = registry.get('terms-toggle');
      expect(element?.type).toBe('toggle');
      
      // Toggle
      element?.handler();
      expect(checked).toBe(true);
      expect(element?.getValue?.()).toBe('true');
      
      element?.handler();
      expect(checked).toBe(false);
    });

    it('should track disabled state', () => {
      registry.register('disabled-btn', {
        type: 'button',
        handler: jest.fn(),
        disabled: true,
      });
      
      const elements = registry.getAll();
      const btn = elements.find(e => e.id === 'disabled-btn');
      expect(btn?.disabled).toBe(true);
    });

    it('should include hints in element info', () => {
      registry.register('otp-input', {
        type: 'input',
        handler: jest.fn(),
        hint: 'Use 111111 for testing',
      });
      
      const elements = registry.getAll();
      const input = elements.find(e => e.id === 'otp-input');
      expect(input?.hint).toBe('Use 111111 for testing');
    });
  });

  describe('state management', () => {
    it('should track current screen', () => {
      state.setScreen('login-page');
      expect(state.getState().screen).toBe('login-page');
      
      state.setScreen('dashboard');
      expect(state.getState().screen).toBe('dashboard');
    });

    it('should track user context', () => {
      state.setUser({
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      });
      
      const appState = state.getState();
      expect(appState.user?.id).toBe('user-123');
      expect(appState.user?.email).toBe('test@example.com');
      expect(appState.user?.role).toBe('admin');
    });

    it('should merge data', () => {
      state.mergeData({ count: 5 });
      expect(state.getState().data?.count).toBe(5);
      
      state.mergeData({ name: 'test' });
      const appState = state.getState();
      expect(appState.data?.count).toBe(5);
      expect(appState.data?.name).toBe('test');
    });

    it('should notify on changes', () => {
      const listener = jest.fn();
      const unsubscribe = state.onChange(listener);
      
      state.setScreen('new-screen');
      expect(listener).toHaveBeenCalled();
      
      unsubscribe();
      listener.mockClear();
      
      state.setScreen('another-screen');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('custom actions', () => {
    it('should register and execute custom actions', async () => {
      const handler = jest.fn(async () => ({
        success: true,
        message: 'Action completed',
      }));
      
      const unregister = customActions.register('test-action', handler);
      
      expect(customActions.has('test-action')).toBe(true);
      expect(customActions.list()).toContain('test-action');
      
      const result = await customActions.execute('test-action', 'test-value');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Action completed');
      expect(handler).toHaveBeenCalledWith('test-value');
      
      unregister();
      expect(customActions.has('test-action')).toBe(false);
    });

    it('should handle action errors gracefully', async () => {
      customActions.register('failing-action', async () => {
        throw new Error('Something went wrong');
      });
      
      const result = await customActions.execute('failing-action');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Something went wrong');
    });
  });

  describe('element info collection', () => {
    it('should collect all elements with full info', () => {
      registry.register('btn-1', { type: 'button', handler: jest.fn() });
      registry.register('input-1', { 
        type: 'input', 
        handler: jest.fn(),
        getValue: () => 'current value',
        hint: 'Enter email',
      });
      registry.register('toggle-1', {
        type: 'toggle',
        handler: jest.fn(),
        disabled: true,
      });
      
      const elements = registry.getAll();
      expect(elements).toHaveLength(3);
      
      const btn = elements.find(e => e.id === 'btn-1');
      expect(btn?.type).toBe('button');
      expect(btn?.actions).toContain('press');
      
      const input = elements.find(e => e.id === 'input-1');
      expect(input?.type).toBe('input');
      expect(input?.value).toBe('current value');
      expect(input?.hint).toBe('Enter email');
      
      const toggle = elements.find(e => e.id === 'toggle-1');
      expect(toggle?.disabled).toBe(true);
    });
  });
});
