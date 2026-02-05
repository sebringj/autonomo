/**
 * Commands - Process control commands from the AI
 * 
 * Handles the standard command set: navigate, press, fill, wait, custom
 */

import { registry } from './registry.js';
import { customActions, type ActionResult } from './actions.js';
import { state, type AppState } from './state.js';

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
  state: AppState;
}

export type NavigationHandler = (screen: string) => Promise<void> | void;

let navigationHandler: NavigationHandler | undefined;

/**
 * Set the navigation handler
 */
export function setNavigationHandler(handler: NavigationHandler): void {
  navigationHandler = handler;
}

/**
 * Navigate to a screen
 */
export async function navigate(screen: string): Promise<CommandResult> {
  try {
    if (!navigationHandler) {
      return {
        success: false,
        error: 'No navigation handler registered',
        state: state.getState(),
      };
    }
    await navigationHandler(screen);
    // Allow time for navigation to complete
    await delay(100);
    return {
      success: true,
      message: `Navigated to ${screen}`,
      state: state.getState(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      state: state.getState(),
    };
  }
}

/**
 * Press/tap an element
 */
export async function press(elementId: string): Promise<CommandResult> {
  const handler = registry.get(elementId);
  if (!handler) {
    return {
      success: false,
      error: `Element not found: ${elementId}. Available: ${registry.list().join(', ')}`,
      state: state.getState(),
    };
  }
  if (handler.disabled) {
    return {
      success: false,
      error: `Element is disabled: ${elementId}`,
      state: state.getState(),
    };
  }
  try {
    await handler.handler();
    await delay(100);
    return {
      success: true,
      message: `Pressed ${elementId}`,
      state: state.getState(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      state: state.getState(),
    };
  }
}

/**
 * Fill text into an input element
 */
export async function fill(
  elementId: string,
  value: string
): Promise<CommandResult> {
  const handler = registry.get(elementId);
  if (!handler) {
    return {
      success: false,
      error: `Element not found: ${elementId}. Available: ${registry.list().join(', ')}`,
      state: state.getState(),
    };
  }
  if (handler.type !== 'input') {
    return {
      success: false,
      error: `Element ${elementId} is not an input (type: ${handler.type})`,
      state: state.getState(),
    };
  }
  if (handler.disabled) {
    return {
      success: false,
      error: `Element is disabled: ${elementId}`,
      state: state.getState(),
    };
  }
  try {
    await handler.handler(value);
    await delay(50);
    return {
      success: true,
      message: `Filled ${elementId} with "${value}"`,
      state: state.getState(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      state: state.getState(),
    };
  }
}

/**
 * Submit an input (press enter)
 */
export async function submit(elementId: string): Promise<CommandResult> {
  const handler = registry.get(elementId);
  if (!handler) {
    return {
      success: false,
      error: `Element not found: ${elementId}`,
      state: state.getState(),
    };
  }
  if (!handler.onSubmit) {
    return {
      success: false,
      error: `Element ${elementId} does not support submit`,
      state: state.getState(),
    };
  }
  try {
    await handler.onSubmit();
    await delay(100);
    return {
      success: true,
      message: `Submitted ${elementId}`,
      state: state.getState(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      state: state.getState(),
    };
  }
}

/**
 * Execute a custom action
 */
export async function custom(
  actionName: string,
  value?: string
): Promise<CommandResult> {
  const result: ActionResult = await customActions.execute(actionName, value);
  return {
    success: result.success,
    message: result.message,
    error: result.error,
    state: state.getState(),
  };
}

/**
 * Wait for a duration
 */
export async function wait(ms: number): Promise<CommandResult> {
  await delay(ms);
  return {
    success: true,
    message: `Waited ${ms}ms`,
    state: state.getState(),
  };
}

/**
 * Get current state without any action
 */
export function getState(): CommandResult {
  return {
    success: true,
    state: state.getState(),
  };
}

/**
 * Execute a command by type
 */
export async function executeCommand(
  command: string,
  target?: string,
  value?: string
): Promise<CommandResult> {
  switch (command.toLowerCase()) {
    case 'navigate':
      if (!target) {
        return {
          success: false,
          error: 'Navigate requires a target screen',
          state: state.getState(),
        };
      }
      return navigate(target);

    case 'press':
    case 'tap':
    case 'click':
      if (!target) {
        return {
          success: false,
          error: 'Press requires a target element ID',
          state: state.getState(),
        };
      }
      return press(target);

    case 'fill':
    case 'type':
      if (!target) {
        return {
          success: false,
          error: 'Fill requires a target element ID',
          state: state.getState(),
        };
      }
      return fill(target, value ?? '');

    case 'submit':
      if (!target) {
        return {
          success: false,
          error: 'Submit requires a target element ID',
          state: state.getState(),
        };
      }
      return submit(target);

    case 'custom':
      if (!target) {
        return {
          success: false,
          error: 'Custom requires an action name',
          state: state.getState(),
        };
      }
      return custom(target, value);

    case 'wait':
      return wait(parseInt(target ?? '1000', 10));

    case 'state':
    case 'snapshot':
      return getState();

    default:
      return {
        success: false,
        error: `Unknown command: ${command}`,
        state: state.getState(),
      };
  }
}

// Utility
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
