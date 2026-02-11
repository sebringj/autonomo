/**
 * Angular Mocks for Testing
 * 
 * Provides minimal mocks for Angular decorators and utilities
 * so we can test the core logic without full Angular TestBed.
 */

// Mock decorator factories
export function Injectable(options?: any): ClassDecorator {
  return (target) => target;
}

export function Directive(options?: any): ClassDecorator {
  return (target) => target;
}

export function Input(bindingPropertyName?: string): PropertyDecorator {
  return () => {};
}

export function HostListener(eventName: string, args?: string[]): MethodDecorator {
  return () => {};
}

// Mock inject function
const injectContext = new Map<any, any>();

export function setInjectValue(token: any, value: any): void {
  injectContext.set(token, value);
}

export function clearInjectContext(): void {
  injectContext.clear();
}

export function inject<T>(token: any): T {
  return injectContext.get(token) as T;
}

// Mock signal
export function signal<T>(initialValue: T): { (): T; set: (v: T) => void } {
  let value = initialValue;
  const s = (() => value) as any;
  s.set = (v: T) => { value = v; };
  return s;
}

export function computed<T>(fn: () => T): () => T {
  return fn;
}

// Mock NgZone
export class NgZone {
  run<T>(fn: () => T): T {
    return fn();
  }
  
  runOutsideAngular<T>(fn: () => T): T {
    return fn();
  }
}

// Mock ElementRef
export class ElementRef<T = any> {
  constructor(public nativeElement: T) {}
}

// Mock DestroyRef
export class DestroyRef {
  private callbacks: Array<() => void> = [];
  
  onDestroy(callback: () => void): void {
    this.callbacks.push(callback);
  }
  
  destroy(): void {
    this.callbacks.forEach(cb => cb());
    this.callbacks = [];
  }
}

// Mock SimpleChanges
export interface SimpleChange {
  previousValue: any;
  currentValue: any;
  firstChange: boolean;
  isFirstChange(): boolean;
}

export interface SimpleChanges {
  [propName: string]: SimpleChange;
}
