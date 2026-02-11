/**
 * Custom Action Utilities
 * 
 * Register custom actions that the AI can invoke.
 */

import { DestroyRef, inject } from '@angular/core';
import { registerCustomAction, type CustomActionHandler } from '@autonomo/core';

/**
 * Register a custom action in a component.
 * Automatically unregisters when the component is destroyed.
 * 
 * @example
 * ```typescript
 * @Component({ ... })
 * export class MyComponent {
 *   constructor() {
 *     useCustomAction('logout', async () => {
 *       await this.authService.logout();
 *       return { success: true, message: 'Logged out' };
 *     });
 *   }
 * }
 * ```
 */
export function useCustomAction(name: string, handler: CustomActionHandler): void {
  const destroyRef = inject(DestroyRef);
  
  const unregister = registerCustomAction(name, handler);
  
  destroyRef.onDestroy(() => {
    unregister();
  });
}
