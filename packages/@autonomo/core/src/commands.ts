/**
 * Commands - Process control commands from the AI
 * 
 * Handles the standard command set: navigate, press, fill, wait, custom
 */

import { registry, type ElementHandler } from './registry.js';
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
 * Simple Levenshtein distance for "did you mean?" suggestions
 */
function levenshtein(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  if (aLower === bLower) return 0;
  if (aLower.length === 0) return bLower.length;
  if (bLower.length === 0) return aLower.length;
  
  const matrix: number[][] = [];
  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      const cost = bLower[i - 1] === aLower[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[bLower.length][aLower.length];
}

/**
 * Find similar element IDs for "did you mean?" suggestions
 */
function findSimilarElements(target: string, maxSuggestions = 3): string[] {
  const elements = registry.list();
  const scored = elements.map(id => ({
    id,
    distance: levenshtein(target, id),
    // Bonus for partial matches (e.g., "Login" in "Login.PhoneInput")
    partialMatch: id.toLowerCase().includes(target.toLowerCase()) || 
                  target.toLowerCase().includes(id.toLowerCase().split('.').pop() || '')
  }));
  
  return scored
    .filter(s => s.distance <= 5 || s.partialMatch) // Only suggest reasonably close matches
    .sort((a, b) => {
      // Prioritize partial matches, then sort by distance
      if (a.partialMatch && !b.partialMatch) return -1;
      if (!a.partialMatch && b.partialMatch) return 1;
      return a.distance - b.distance;
    })
    .slice(0, maxSuggestions)
    .map(s => s.id);
}

/**
 * Format element not found error with helpful suggestions
 */
function elementNotFoundError(elementId: string): string {
  const allElements = registry.getAll();
  const suggestions = findSimilarElements(elementId);
  
  let error = `Element not found: "${elementId}"`;
  
  if (suggestions.length > 0) {
    error += `\nDid you mean: ${suggestions.join(', ')}?`;
  }
  
  // Show available elements by type for context
  const byType = new Map<string, string[]>();
  for (const el of allElements) {
    const list = byType.get(el.type) || [];
    list.push(el.id);
    byType.set(el.type, list);
  }
  
  if (byType.size > 0) {
    error += '\n\nAvailable elements:';
    for (const [type, ids] of byType) {
      error += `\n  ${type}: ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? ` (+${ids.length - 5} more)` : ''}`;
    }
  }
  
  return error;
}

/**
 * Format action mismatch error with suggestions
 */
function actionMismatchError(elementId: string, handler: ElementHandler, attemptedAction: string): string {
  const supportedActions = getSupportedActions(handler);
  return `Cannot ${attemptedAction} on "${elementId}" (type: ${handler.type}). ` +
         `Supported actions: ${supportedActions.join(', ')}`;
}

/**
 * Get supported actions for an element type
 */
function getSupportedActions(handler: ElementHandler): string[] {
  switch (handler.type) {
    case 'button':
    case 'link':
      return ['press'];
    case 'input':
      return handler.onSubmit ? ['fillIn', 'submit'] : ['fillIn'];
    case 'toggle':
      return ['press'];
    case 'select':
      return ['fillIn'];
    case 'custom':
      return ['press', 'fillIn'];
    default:
      return ['press'];
  }
}

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
      error: elementNotFoundError(elementId),
      state: state.getState(),
    };
  }
  // Check if press is supported for this element type
  if (handler.type === 'input') {
    return {
      success: false,
      error: actionMismatchError(elementId, handler, 'press'),
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
      error: elementNotFoundError(elementId),
      state: state.getState(),
    };
  }
  if (handler.type !== 'input' && handler.type !== 'select' && handler.type !== 'custom') {
    return {
      success: false,
      error: actionMismatchError(elementId, handler, 'fillIn'),
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
      error: elementNotFoundError(elementId),
      state: state.getState(),
    };
  }
  if (!handler.onSubmit) {
    return {
      success: false,
      error: `Element "${elementId}" does not support submit. ` +
             `Only input elements with onSubmit handler support this action.`,
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
