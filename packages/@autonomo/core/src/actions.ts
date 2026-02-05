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

type ActionsChangeListener = () => void;

class CustomActionsRegistry {
  private actions = new Map<string, CustomActionHandler>();
  private listeners = new Set<ActionsChangeListener>();

  /**
   * Register a custom action
   * @returns Unregister function
   */
  register(name: string, handler: CustomActionHandler): () => void {
    this.actions.set(name, handler);
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
    const handler = this.actions.get(name);
    if (!handler) {
      return {
        success: false,
        error: `Unknown custom action: ${name}`,
      };
    }
    try {
      return await handler(value);
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
  handler: CustomActionHandler
): () => void {
  return customActions.register(name, handler);
}
