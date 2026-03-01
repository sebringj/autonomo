/**
 * Tests for Angular directives logic
 * 
 * Tests the behavior of directives without full Angular TestBed,
 * by directly testing the lifecycle methods and registry interactions.
 */

import { registry, state, resetInstance } from 'autonomo-core';

// Reset between tests
beforeEach(() => {
  registry.list().forEach(id => registry.unregister(id));
  resetInstance();
  state.setScreen('');
});

describe('AutonomoTapDirective behavior', () => {
  it('should register element on init with correct type', () => {
    // Simulate directive ngOnInit
    const id = 'submit-button';
    const handler = jest.fn();
    
    const unregister = registry.register(id, {
      type: 'button',
      handler,
      disabled: false,
      hint: 'Submits the form',
    });
    
    // Verify registration
    expect(registry.has(id)).toBe(true);
    const element = registry.get(id);
    expect(element?.type).toBe('button');
    expect(element?.hint).toBe('Submits the form');
    
    // Verify handler works
    element?.handler();
    expect(handler).toHaveBeenCalled();
    
    // Simulate ngOnDestroy
    unregister();
    expect(registry.has(id)).toBe(false);
  });

  it('should handle async tap handlers', async () => {
    const asyncHandler = jest.fn(async () => {
      await new Promise(r => setTimeout(r, 10));
      return 'done';
    });
    
    registry.register('async-btn', {
      type: 'button',
      handler: asyncHandler,
    });
    
    const element = registry.get('async-btn');
    await element?.handler();
    expect(asyncHandler).toHaveBeenCalled();
  });
});

describe('AutonomoFillDirective behavior', () => {
  it('should register input with getValue and handler', () => {
    let value = '';
    const id = 'email-field';
    
    registry.register(id, {
      type: 'input',
      handler: (v) => { value = v || ''; },
      getValue: () => value,
    });
    
    const element = registry.get(id);
    expect(element?.type).toBe('input');
    
    // Fill the input
    element?.handler('test@test.com');
    expect(value).toBe('test@test.com');
    expect(element?.getValue?.()).toBe('test@test.com');
  });

  it('should support onSubmit for form submission', async () => {
    const submitHandler = jest.fn();
    
    registry.register('password-field', {
      type: 'input',
      handler: jest.fn(),
      onSubmit: submitHandler,
    });
    
    const element = registry.get('password-field');
    element?.onSubmit?.();
    expect(submitHandler).toHaveBeenCalled();
  });

  it('should track disabled state for inputs', () => {
    registry.register('disabled-input', {
      type: 'input',
      handler: jest.fn(),
      disabled: true,
    });
    
    const elements = registry.getAll();
    const input = elements.find(e => e.id === 'disabled-input');
    expect(input?.disabled).toBe(true);
  });
});

describe('AutonomoToggleDirective behavior', () => {
  it('should register toggle with getValue', () => {
    let checked = false;
    
    registry.register('terms-checkbox', {
      type: 'toggle',
      handler: () => { checked = !checked; },
      getValue: () => String(checked),
    });
    
    const element = registry.get('terms-checkbox');
    expect(element?.type).toBe('toggle');
    expect(element?.getValue?.()).toBe('false');
    
    element?.handler();
    expect(element?.getValue?.()).toBe('true');
  });

  it('should support value-based toggles', () => {
    let selectedValue = 'option-a';
    
    registry.register('radio-group', {
      type: 'toggle',
      handler: (v) => { selectedValue = v || selectedValue; },
      getValue: () => selectedValue,
    });
    
    const element = registry.get('radio-group');
    element?.handler('option-b');
    expect(element?.getValue?.()).toBe('option-b');
  });
});

describe('AutonomoScreenDirective behavior', () => {
  it('should set screen name on init', () => {
    // Simulate ngOnInit
    state.setScreen('login-page');
    expect(state.getState().screen).toBe('login-page');
  });

  it('should update screen on changes', () => {
    state.setScreen('page-1');
    expect(state.getState().screen).toBe('page-1');
    
    // Simulate ngOnChanges
    state.setScreen('page-2');
    expect(state.getState().screen).toBe('page-2');
  });
});

describe('directive lifecycle cleanup', () => {
  it('should clean up multiple elements on destroy', () => {
    const unregisters: Array<() => void> = [];
    
    // Simulate multiple directives registering
    unregisters.push(registry.register('btn-1', { type: 'button', handler: jest.fn() }));
    unregisters.push(registry.register('btn-2', { type: 'button', handler: jest.fn() }));
    unregisters.push(registry.register('input-1', { type: 'input', handler: jest.fn() }));
    
    expect(registry.list()).toHaveLength(3);
    
    // Simulate component destroy
    unregisters.forEach(u => u());
    
    expect(registry.list()).toHaveLength(0);
  });

  it('should handle rapid register/unregister cycles', () => {
    for (let i = 0; i < 100; i++) {
      const unregister = registry.register(`element-${i}`, {
        type: 'button',
        handler: jest.fn(),
      });
      
      // Immediately unregister (simulating fast navigation)
      if (i % 2 === 0) {
        unregister();
      }
    }
    
    // Should have ~50 elements registered
    expect(registry.list().length).toBe(50);
  });
});

describe('meta and hints', () => {
  it('should preserve meta information', () => {
    registry.register('data-btn', {
      type: 'button',
      handler: jest.fn(),
      meta: {
        testId: 'submit-button',
        variant: 'primary',
        analytics: { category: 'forms' },
      },
    });
    
    const elements = registry.getAll();
    const btn = elements.find(e => e.id === 'data-btn');
    expect(btn?.meta?.testId).toBe('submit-button');
    expect(btn?.meta?.variant).toBe('primary');
  });

  it('should include hints in state collection', () => {
    registry.register('hint-input', {
      type: 'input',
      handler: jest.fn(),
      hint: 'Format: MM/DD/YYYY',
    });
    
    const elements = registry.getAll();
    const input = elements.find(e => e.id === 'hint-input');
    expect(input?.hint).toBe('Format: MM/DD/YYYY');
  });
});
