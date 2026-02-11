/**
 * AutonomoFillDirective
 * 
 * Registers a fill/input handler for AI control.
 * Works with input, textarea, and custom input components.
 * 
 * @example
 * ```html
 * <input autonomoFill="email-input" [(ngModel)]="email" />
 * ```
 */

import { Directive, Input, HostListener, ElementRef, inject } from '@angular/core';
import type { OnInit, OnDestroy } from '@angular/core';
import { registerFillHandler } from '@autonomo/core';
import { AutonomoService } from './autonomo.service.js';

@Directive({
  selector: '[autonomoFill]',
  standalone: true,
})
export class AutonomoFillDirective implements OnInit, OnDestroy {
  private autonomo = inject(AutonomoService);
  private elementRef = inject(ElementRef<HTMLInputElement | HTMLTextAreaElement>);
  private unregister?: () => void;

  /** Unique identifier for this element */
  @Input('autonomoFill') id!: string;

  /** Whether the element is disabled */
  @Input() autonomoDisabled = false;

  /** AI hint for this element */
  @Input() autonomoHint?: string;

  /** Additional metadata */
  @Input() autonomoMeta?: Record<string, unknown>;

  /** Custom fill handler (optional - defaults to setting element value) */
  @Input() autonomoFillHandler?: (value: string) => void | Promise<void>;

  /** Submit handler for when AI wants to submit after filling */
  @Input() autonomoOnSubmit?: () => void | Promise<void>;

  ngOnInit(): void {
    if (!this.id) {
      console.warn('[Autonomo] autonomoFill directive requires an id');
      return;
    }

    const handler = (value: string) => {
      if (this.autonomoFillHandler) {
        return this.autonomoFillHandler(value);
      }
      
      // Default: set the native element value and dispatch input event
      const el = this.elementRef.nativeElement;
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const getValue = () => {
      return this.elementRef.nativeElement.value || '';
    };

    this.unregister = registerFillHandler(this.id, handler, {
      getValue,
      onSubmit: this.autonomoOnSubmit,
      disabled: this.autonomoDisabled,
      hint: this.autonomoHint,
      meta: this.autonomoMeta,
    });
  }

  ngOnDestroy(): void {
    this.unregister?.();
  }
}
