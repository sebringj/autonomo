/**
 * AutonomoScreenDirective
 * 
 * Sets the current screen name for state reporting.
 * Apply to the root element of each screen/page component.
 * 
 * @example
 * ```html
 * <div autonomoScreen="login-page">
 *   <!-- login form content -->
 * </div>
 * ```
 */

import { Directive, Input, inject } from '@angular/core';
import type { OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { state } from '@autonomo/core';
import { AutonomoService } from './autonomo.service.js';

@Directive({
  selector: '[autonomoScreen]',
  standalone: true,
})
export class AutonomoScreenDirective implements OnInit, OnChanges {
  private autonomo = inject(AutonomoService);

  /** Screen name to report to Autonomo */
  @Input('autonomoScreen') screen!: string;

  ngOnInit(): void {
    if (this.screen) {
      state.setScreen(this.screen);
      this.autonomo.reportState();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['screen'] && !changes['screen'].firstChange) {
      state.setScreen(this.screen);
      this.autonomo.reportState();
    }
  }
}
