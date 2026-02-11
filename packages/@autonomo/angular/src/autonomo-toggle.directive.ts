/**
 * AutonomoToggleDirective
 * 
 * Registers a toggle handler for AI control.
 * Works with checkboxes, switches, and custom toggle components.
 * 
 * @example
 * ```html
 * <input type="checkbox" autonomoToggle="terms-checkbox" [(ngModel)]="accepted" />
 * ```
 */

import { Directive, Input, ElementRef, inject } from '@angular/core';
import type { OnInit, OnDestroy } from '@angular/core';
import { registerToggleHandler } from '@autonomo/core';
import { AutonomoService } from './autonomo.service.js';

@Directive({
  selector: '[autonomoToggle]',
  standalone: true,
})
export class AutonomoToggleDirective implements OnInit, OnDestroy {
  private autonomo = inject(AutonomoService);
  private elementRef = inject(ElementRef<HTMLInputElement>);
  private unregister?: () => void;

  /** Unique identifier for this element */
  @Input('autonomoToggle') id!: string;

  /** Whether the element is disabled */
  @Input() autonomoDisabled = false;

  /** AI hint for this element */
  @Input() autonomoHint?: string;

  /** Additional metadata */
  @Input() autonomoMeta?: Record<string, unknown>;

  /** Custom toggle handler (optional - defaults to clicking element) */
  @Input() autonomoToggleHandler?: (value?: string) => void | Promise<void>;

  ngOnInit(): void {
    if (!this.id) {
      console.warn('[Autonomo] autonomoToggle directive requires an id');
      return;
    }

    const handler = (value?: string) => {
      if (this.autonomoToggleHandler) {
        return this.autonomoToggleHandler(value);
      }
      
      // Default: click the element to toggle
      const el = this.elementRef.nativeElement;
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = !el.checked;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        el.click();
      }
    };

    const getValue = () => {
      const el = this.elementRef.nativeElement;
      if (el.type === 'checkbox' || el.type === 'radio') {
        return el.checked ? 'true' : 'false';
      }
      return el.value || '';
    };

    this.unregister = registerToggleHandler(this.id, handler, {
      getValue,
      disabled: this.autonomoDisabled,
      hint: this.autonomoHint,
      meta: this.autonomoMeta,
    });
  }

  ngOnDestroy(): void {
    this.unregister?.();
  }
}
