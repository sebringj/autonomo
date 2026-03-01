/**
 * Custom Actions - Fast-path operations for complex interactions
 * 
 * Some operations (like OTP entry) require multiple steps that are
 * slow and flaky when done individually. Custom actions provide
 * atomic operations that handle these cases.
 */

export type CustomActionHandler = (
  value?: string
) => Promise<ActionResult> | ActionResult;

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

/**
 * Metadata for a custom action - helps AI understand what it does
 */
export interface CustomActionMeta {
  /** Human-readable description of what the action does */
  description?: string;
  /** Argument schema: { argName: 'type description' } */
  args?: Record<string, string>;
  /** Example usage */
  example?: { value?: string };
}

/**
 * Rich custom action info returned in state
 */
export interface CustomActionInfo {
  name: string;
  description?: string;
  args?: Record<string, string>;
  example?: { value?: string };
}

type ActionsChangeListener = () => void;

interface RegisteredAction {
  handler: CustomActionHandler;
  meta?: CustomActionMeta;
}

class CustomActionsRegistry {
  private actions = new Map<string, RegisteredAction>();
  private listeners = new Set<ActionsChangeListener>();

  /**
   * Register a custom action
   * @param name - Action name (e.g., 'fillOtp')
   * @param handler - Function to execute the action
   * @param meta - Optional metadata describing the action for AI
   * @returns Unregister function
   */
  register(name: string, handler: CustomActionHandler, meta?: CustomActionMeta): () => void {
    this.actions.set(name, { handler, meta });
    this.notifyChange();
    return () => this.unregister(name);
  }

  /**
   * Unregister a custom action
   */
  unregister(name: string): void {
    this.actions.delete(name);
    this.notifyChange();
  }

  /**
   * Execute a custom action
   */
  async execute(name: string, value?: string): Promise<ActionResult> {
    const action = this.actions.get(name);
    if (!action) {
      return {
        success: false,
        error: `Unknown custom action: ${name}. Available: ${this.list().join(', ') || 'none'}`,
      };
    }
    try {
      return await action.handler(value);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Check if action exists
   */
  has(name: string): boolean {
    return this.actions.has(name);
  }

  /**
   * List all action names
   */
  list(): string[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Get rich info about all actions (for AI discoverability)
   */
  getAll(): CustomActionInfo[] {
    return Array.from(this.actions.entries()).map(([name, action]) => ({
      name,
      description: action.meta?.description,
      args: action.meta?.args,
      example: action.meta?.example,
    }));
  }

  /**
   * Subscribe to changes
   */
  onChange(listener: ActionsChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyChange(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const customActions = new CustomActionsRegistry();

// Convenience function
export function registerCustomAction(
  name: string,
  handler: CustomActionHandler,
  meta?: CustomActionMeta
): () => void {
  return customActions.register(name, handler, meta);
}
