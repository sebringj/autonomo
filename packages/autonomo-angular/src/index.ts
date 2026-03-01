/**
 * autonomo-angular
 * 
 * Angular service, directives, and utilities for Autonomo integration.
 * 
 * @example
 * ```typescript
 * // Option 1: Using NgModule
 * import { AutonomoModule } from 'autonomo-angular';
 * 
 * @NgModule({
 *   imports: [
 *     AutonomoModule.forRoot({
 *       name: 'my-app',
 *       serverUrl: 'ws://localhost:9876',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * 
 * // Option 2: Using standalone components
 * import { AutonomoService, AUTONOMO_DIRECTIVES } from 'autonomo-angular';
 * 
 * @Component({
 *   standalone: true,
 *   imports: [...AUTONOMO_DIRECTIVES],
 *   providers: [AutonomoService],
 * })
 * export class AppComponent {
 *   autonomo = inject(AutonomoService);
 *   
 *   ngOnInit() {
 *     this.autonomo.init({ name: 'my-app' });
 *   }
 * }
 * ```
 */

// Module
export { AutonomoModule, AUTONOMO_CONFIG, AUTONOMO_DIRECTIVES } from './autonomo.module.js';

// Service
export { AutonomoService, type AutonomoConfig, type AutonomoConnection } from './autonomo.service.js';

// Directives
export { AutonomoTapDirective } from './autonomo-tap.directive.js';
export { AutonomoFillDirective } from './autonomo-fill.directive.js';
export { AutonomoToggleDirective } from './autonomo-toggle.directive.js';
export { AutonomoScreenDirective } from './autonomo-screen.directive.js';

// Custom Actions
export { useCustomAction } from './custom-action.js';

// Re-export core utilities for convenience
export {
  registry,
  state,
  customActions,
  registerTapHandler,
  registerFillHandler,
  registerToggleHandler,
  registerCustomAction,
  setNavigationHandler,
  initInstance,
  getInstance,
  requireInstance,
  getBridgeId,
  resetInstance,
  type ElementType,
  type ElementHandler,
  type ElementInfo,
  type AppState,
  type CommandResult,
  type CustomActionHandler,
  type ActionResult,
  type InstanceConfig,
  type InstanceInfo,
  type NavigationHandler,
} from 'autonomo-core';
