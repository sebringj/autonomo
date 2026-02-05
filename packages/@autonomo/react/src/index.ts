/**
 * @autonomo/react
 * 
 * React hooks and components for Autonomo integration.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  registry,
  state,
  registerTapHandler,
  registerFillHandler,
  registerToggleHandler,
  registerCustomAction,
  setNavigationHandler,
  type ElementType,
  type CustomActionHandler,
  type NavigationHandler,
} from '@autonomo/core';

export {
  registry,
  state,
  registerCustomAction,
  setNavigationHandler,
} from '@autonomo/core';

export type {
  ElementType,
  ElementHandler,
  ElementInfo,
  AppState,
  CommandResult,
} from '@autonomo/core';

/**
 * Register a tap handler for a component
 * Automatically unregisters on unmount
 */
export function useTapHandler(
  id: string,
  handler: () => void | Promise<void>,
  options?: {
    disabled?: boolean;
    hint?: string;
    meta?: Record<string, unknown>;
  }
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return registerTapHandler(id, () => handlerRef.current(), options);
  }, [id, options?.disabled, options?.hint]);
}

/**
 * Register a fill handler for an input component
 * Automatically unregisters on unmount
 */
export function useFillHandler(
  id: string,
  handler: (value: string) => void | Promise<void>,
  options?: {
    getValue?: () => string;
    onSubmit?: () => void;
    disabled?: boolean;
    hint?: string;
    meta?: Record<string, unknown>;
  }
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return registerFillHandler(
      id,
      (value) => handlerRef.current(value),
      options
    );
  }, [id, options?.disabled, options?.hint]);
}

/**
 * Register a toggle handler for a switch/checkbox
 * Automatically unregisters on unmount
 */
export function useToggleHandler(
  id: string,
  handler: (value?: string) => void | Promise<void>,
  options?: {
    getValue?: () => string;
    disabled?: boolean;
    hint?: string;
    meta?: Record<string, unknown>;
  }
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return registerToggleHandler(
      id,
      (value) => handlerRef.current(value),
      options
    );
  }, [id, options?.disabled, options?.hint]);
}

/**
 * Register a custom action
 * Automatically unregisters on unmount
 */
export function useCustomAction(
  name: string,
  handler: CustomActionHandler
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return registerCustomAction(name, (value) => handlerRef.current(value));
  }, [name]);
}

/**
 * Set the current screen name
 */
export function useScreen(screen: string): void {
  useEffect(() => {
    state.setScreen(screen);
  }, [screen]);
}

/**
 * Set user context
 */
export function useUser(user: { id?: string; email?: string; role?: string } | undefined): void {
  useEffect(() => {
    state.setUser(user);
  }, [user?.id, user?.email, user?.role]);
}

/**
 * Set navigation handler for the app
 */
export function useNavigationHandler(handler: NavigationHandler): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    setNavigationHandler((screen) => handlerRef.current(screen));
  }, []);
}

/**
 * Hook to track app state data
 */
export function useAppData(data: Record<string, unknown>): void {
  useEffect(() => {
    state.mergeData(data);
  }, [JSON.stringify(data)]);
}

/**
 * Create a callback that triggers AI state refresh after execution
 */
export function useWithStateRefresh<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  return useCallback(
    ((...args) => {
      const result = callback(...args);
      // Trigger state notification after action
      setTimeout(() => state.notifyChange(), 50);
      return result;
    }) as T,
    [callback]
  );
}
