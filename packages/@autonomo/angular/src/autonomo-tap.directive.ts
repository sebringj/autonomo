/**
 * AutonomoTapDirective
 * 
 * Registers a tap/click handler for AI control.
 * 
 * @example
 * ```html
 * <button autonomoTap="submit-btn" (click)="onSubmit()">Submit</button>
 * ```
 */

import { Directive, Input, HostListener, inject } from '@angular/core';
import type { OnInit, OnDestroy } from '@angular/core';
import { registerTapHandler } from '@autonomo/core';
import { AutonomoService } from './autonomo.service.js';

@Directive({
  selector: '[autonomoTap]',
  standalone: true,
})
export class AutonomoTapDirective implements OnInit, OnDestroy {
  private autonomo = inject(AutonomoService);
  private unregister?: () => void;
  private pendingHandler?: () => void | Promise<void>;

  /** Unique identifier for this element */
  @Input('autonomoTap') id!: string;

  /** Whether the element is disabled */
  @Input() autonomoDisabled = false;

  /** AI hint for this element */
  @Input() autonomoHint?: string;

  /** Additional metadata */
  @Input() autonomoMeta?: Record<string, unknown>;

  /** The tap handler callback */
  @Input() autonomoTapHandler?: () => void | Promise<void>;

  ngOnInit(): void {
    if (!this.id) {
      console.warn('[Autonomo] autonomoTap directive requires an id');
      return;
    }

    const handler = () => {
      if (this.autonomoTapHandler) {
        return this.autonomoTapHandler();
      }
      // If no handler provided, trigger click on host element
      this.pendingHandler?.();
    };

    this.unregister = registerTapHandler(this.id, handler, {
      disabled: this.autonomoDisabled,
      hint: this.autonomoHint,
      meta: this.autonomoMeta,
    });
  }

  /**
   * Store the click handler to allow triggering via AI
   */
  @HostListener('click')
  onClick(): void {
    // This is just to capture that a click happened
    // The actual handler is called through autonomoTapHandler
  }

  ngOnDestroy(): void {
    this.unregister?.();
  }
}
