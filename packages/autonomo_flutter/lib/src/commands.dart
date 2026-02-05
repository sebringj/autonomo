/// Commands - Process control commands from the AI
///
/// Handles the standard command set: navigate, press, fill, wait, custom

import 'registry.dart';
import 'actions.dart';
import 'state.dart';

/// Result of a command execution
class CommandResult {
  final bool success;
  final String? message;
  final String? error;
  final AppState state;

  const CommandResult({
    required this.success,
    this.message,
    this.error,
    required this.state,
  });

  Map<String, dynamic> toJson() => {
        'success': success,
        if (message != null) 'message': message,
        if (error != null) 'error': error,
        'state': state.toJson(),
      };
}

typedef NavigationHandler = Future<void> Function(String screen);

NavigationHandler? _navigationHandler;

/// Set the navigation handler
void setNavigationHandler(NavigationHandler handler) {
  _navigationHandler = handler;
}

/// Navigate to a screen
Future<CommandResult> navigate(String screen) async {
  try {
    if (_navigationHandler == null) {
      return CommandResult(
        success: false,
        error: 'No navigation handler registered',
        state: state.getState(),
      );
    }
    await _navigationHandler!(screen);
    await Future.delayed(const Duration(milliseconds: 100));
    return CommandResult(
      success: true,
      message: 'Navigated to $screen',
      state: state.getState(),
    );
  } catch (err) {
    return CommandResult(
      success: false,
      error: err.toString(),
      state: state.getState(),
    );
  }
}

/// Press/tap an element
Future<CommandResult> press(String elementId) async {
  final handler = registry.get(elementId);
  if (handler == null) {
    return CommandResult(
      success: false,
      error:
          'Element not found: $elementId. Available: ${registry.list().join(', ')}',
      state: state.getState(),
    );
  }
  if (handler.disabled) {
    return CommandResult(
      success: false,
      error: 'Element is disabled: $elementId',
      state: state.getState(),
    );
  }
  try {
    await handler.handler();
    await Future.delayed(const Duration(milliseconds: 100));
    return CommandResult(
      success: true,
      message: 'Pressed $elementId',
      state: state.getState(),
    );
  } catch (err) {
    return CommandResult(
      success: false,
      error: err.toString(),
      state: state.getState(),
    );
  }
}

/// Fill text into an input element
Future<CommandResult> fill(String elementId, String value) async {
  final handler = registry.get(elementId);
  if (handler == null) {
    return CommandResult(
      success: false,
      error:
          'Element not found: $elementId. Available: ${registry.list().join(', ')}',
      state: state.getState(),
    );
  }
  if (handler.type != ElementType.input) {
    return CommandResult(
      success: false,
      error: 'Element $elementId is not an input (type: ${handler.type.name})',
      state: state.getState(),
    );
  }
  if (handler.disabled) {
    return CommandResult(
      success: false,
      error: 'Element is disabled: $elementId',
      state: state.getState(),
    );
  }
  try {
    await handler.handler(value);
    await Future.delayed(const Duration(milliseconds: 50));
    return CommandResult(
      success: true,
      message: 'Filled $elementId with "$value"',
      state: state.getState(),
    );
  } catch (err) {
    return CommandResult(
      success: false,
      error: err.toString(),
      state: state.getState(),
    );
  }
}

/// Submit an input (press enter)
Future<CommandResult> submit(String elementId) async {
  final handler = registry.get(elementId);
  if (handler == null) {
    return CommandResult(
      success: false,
      error: 'Element not found: $elementId',
      state: state.getState(),
    );
  }
  if (handler.onSubmit == null) {
    return CommandResult(
      success: false,
      error: 'Element $elementId does not support submit',
      state: state.getState(),
    );
  }
  try {
    await handler.onSubmit!();
    await Future.delayed(const Duration(milliseconds: 100));
    return CommandResult(
      success: true,
      message: 'Submitted $elementId',
      state: state.getState(),
    );
  } catch (err) {
    return CommandResult(
      success: false,
      error: err.toString(),
      state: state.getState(),
    );
  }
}

/// Execute a custom action
Future<CommandResult> custom(String actionName, [String? value]) async {
  final result = await customActions.execute(actionName, value);
  return CommandResult(
    success: result.success,
    message: result.message,
    error: result.error,
    state: state.getState(),
  );
}

/// Wait for a duration
Future<CommandResult> wait(int ms) async {
  await Future.delayed(Duration(milliseconds: ms));
  return CommandResult(
    success: true,
    message: 'Waited ${ms}ms',
    state: state.getState(),
  );
}

/// Get current state without any action
CommandResult getState() {
  return CommandResult(
    success: true,
    state: state.getState(),
  );
}

/// Execute a command by type
Future<CommandResult> executeCommand(
  String command, [
  String? target,
  String? value,
]) async {
  switch (command.toLowerCase()) {
    case 'navigate':
      if (target == null) {
        return CommandResult(
          success: false,
          error: 'Navigate requires a target screen',
          state: state.getState(),
        );
      }
      return navigate(target);

    case 'press':
    case 'tap':
    case 'click':
      if (target == null) {
        return CommandResult(
          success: false,
          error: 'Press requires a target element ID',
          state: state.getState(),
        );
      }
      return press(target);

    case 'fill':
    case 'type':
      if (target == null) {
        return CommandResult(
          success: false,
          error: 'Fill requires a target element ID',
          state: state.getState(),
        );
      }
      return fill(target, value ?? '');

    case 'submit':
      if (target == null) {
        return CommandResult(
          success: false,
          error: 'Submit requires a target element ID',
          state: state.getState(),
        );
      }
      return submit(target);

    case 'custom':
      if (target == null) {
        return CommandResult(
          success: false,
          error: 'Custom requires an action name',
          state: state.getState(),
        );
      }
      return custom(target, value);

    case 'wait':
      return wait(int.tryParse(target ?? '1000') ?? 1000);

    case 'state':
    case 'snapshot':
      return getState();

    default:
      return CommandResult(
        success: false,
        error: 'Unknown command: $command',
        state: state.getState(),
      );
  }
}
