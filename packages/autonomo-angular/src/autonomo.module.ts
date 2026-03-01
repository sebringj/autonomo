/**
 * AutonomoModule
 * 
 * Angular module that provides all Autonomo directives and services.
 * 
 * @example
 * ```typescript
 * // In your AppModule or standalone component
 * import { AutonomoModule } from 'autonomo-angular';
 * 
 * @NgModule({
 *   imports: [AutonomoModule],
 * })
 * export class AppModule {}
 * ```
 */

import { NgModule, InjectionToken } from '@angular/core';
import type { ModuleWithProviders } from '@angular/core';
import { AutonomoService, type AutonomoConfig } from './autonomo.service.js';
import { AutonomoTapDirective } from './autonomo-tap.directive.js';
import { AutonomoFillDirective } from './autonomo-fill.directive.js';
import { AutonomoToggleDirective } from './autonomo-toggle.directive.js';
import { AutonomoScreenDirective } from './autonomo-screen.directive.js';

/** Injection token for Autonomo configuration */
export const AUTONOMO_CONFIG = new InjectionToken<AutonomoConfig>('AUTONOMO_CONFIG');

/**
 * Standalone directives array for use with standalone components
 */
export const AUTONOMO_DIRECTIVES = [
  AutonomoTapDirective,
  AutonomoFillDirective,
  AutonomoToggleDirective,
  AutonomoScreenDirective,
] as const;

@NgModule({
  imports: [...AUTONOMO_DIRECTIVES],
  exports: [...AUTONOMO_DIRECTIVES],
})
export class AutonomoModule {
  /**
   * Configure Autonomo for the root module.
   * 
   * @example
   * ```typescript
   * @NgModule({
   *   imports: [
   *     AutonomoModule.forRoot({
   *       name: 'my-app',
   *       serverUrl: 'ws://localhost:9876',
   *       debug: true,
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  static forRoot(config: AutonomoConfig): ModuleWithProviders<AutonomoModule> {
    return {
      ngModule: AutonomoModule,
      providers: [
        AutonomoService,
        { provide: AUTONOMO_CONFIG, useValue: config },
        {
          provide: 'AUTONOMO_INIT',
          useFactory: (service: AutonomoService, cfg: AutonomoConfig) => {
            service.init(cfg);
            return true;
          },
          deps: [AutonomoService, AUTONOMO_CONFIG],
          multi: true,
        },
      ],
    };
  }
}
