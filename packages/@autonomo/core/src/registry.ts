/**
 * Element Registry - Tracks interactive elements for AI control
 * 
 * Components register themselves when mounted, unregister when unmounted.
 * This provides a live map of what the AI can interact with.
 */

export type ElementType = 'button' | 'input' | 'toggle' | 'select' | 'link' | 'custom';

export interface ElementHandler {
  /** Type of interaction */
  type: ElementType;
  /** Handler to invoke the element's action */
  handler: (value?: string) => void | Promise<void>;
  /** Whether the element is currently disabled */
  disabled?: boolean;
  /** For inputs: get current value */
  getValue?: () => string;
  /** For inputs: trigger submit/enter */
  onSubmit?: () => void;
  /** Usage hint for AI (e.g., "Use OTP code 111111 in dev") */
  hint?: string;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

export interface ElementInfo {
  id: string;
  type: ElementType;
  /** Actions this element supports (e.g., ['press'], ['fillIn', 'submit']) */
  actions: string[];
  disabled?: boolean;
  value?: string;
  hint?: string;
  meta?: Record<string, unknown>;
}

type RegistryChangeListener = () => void;

class ElementRegistry {
  private elements = new Map<string, ElementHandler>();
  private listeners = new Set<RegistryChangeListener>();

  /**
   * Register an interactive element
   * @returns Unregister function
   */
  register(id: string, handler: ElementHandler): () => void {
    this.elements.set(id, handler);
    this.notifyChange();
    return () => this.unregister(id);
  }

  /**
   * Unregister an element
   */
  unregister(id: string): void {
    this.elements.delete(id);
    this.notifyChange();
  }

  /**
   * Get handler for an element
   */
  get(id: string): ElementHandler | undefined {
    return this.elements.get(id);
  }

  /**
   * Check if element exists
   */
  has(id: string): boolean {
    return this.elements.has(id);
  }

  /**
   * List all element IDs
   */
  list(): string[] {
    return Array.from(this.elements.keys());
  }

  /**
   * Get detailed info for all elements
   */
  getAll(): ElementInfo[] {
    return Array.from(this.elements.entries()).map(([id, handler]) => ({
      id,
      type: handler.type,
      actions: this.getActionsForType(handler),
      disabled: handler.disabled,
      value: handler.getValue?.(),
      hint: handler.hint,
      meta: handler.meta,
    }));
  }

  /**
   * Get supported actions for an element based on its type and capabilities
   */
  private getActionsForType(handler: ElementHandler): string[] {
    switch (handler.type) {
      case 'button':
      case 'link':
        return ['press'];
      case 'input':
        const inputActions = ['fillIn'];
        if (handler.onSubmit) inputActions.push('submit');
        return inputActions;
      case 'toggle':
        return ['press'];
      case 'select':
        return ['select', 'fillIn'];
      case 'custom':
        return ['press', 'fillIn']; // Custom elements may support both
      default:
        return ['press'];
    }
  }

  /**
   * Find elements matching a pattern
   */
  find(pattern: string | RegExp): ElementInfo[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return this.getAll().filter(el => regex.test(el.id));
  }

  /**
   * Clear all elements (useful for screen transitions)
   */
  clear(): void {
    this.elements.clear();
    this.notifyChange();
  }

  /**
   * Get count of registered elements
   */
  get size(): number {
    return this.elements.size;
  }

  /**
   * Subscribe to registry changes
   */
  onChange(listener: RegistryChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyChange(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const registry = new ElementRegistry();

// Convenience registration functions
export function registerTapHandler(
  id: string,
  handler: () => void | Promise<void>,
  options?: { disabled?: boolean; hint?: string; meta?: Record<string, unknown> }
): () => void {
  return registry.register(id, {
    type: 'button',
    handler,
    ...options,
  });
}

export function registerFillHandler(
  id: string,
  handler: (value: string) => void | Promise<void>,
  options?: {
    getValue?: () => string;
    onSubmit?: () => void;
    disabled?: boolean;
    hint?: string;
    meta?: Record<string, unknown>;
  }
): () => void {
  return registry.register(id, {
    type: 'input',
    handler: (value) => handler(value ?? ''),
    ...options,
  });
}

export function registerToggleHandler(
  id: string,
  handler: (value?: string) => void | Promise<void>,
  options?: {
    getValue?: () => string;
    disabled?: boolean;
    hint?: string;
    meta?: Record<string, unknown>;
  }
): () => void {
  return registry.register(id, {
    type: 'toggle',
    handler,
    ...options,
  });
}
