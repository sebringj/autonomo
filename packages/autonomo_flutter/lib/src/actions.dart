/// Custom Actions - Fast-path operations for complex interactions
///
/// Some operations (like OTP entry) require multiple steps that are
/// slow and flaky when done individually. Custom actions provide
/// atomic operations that handle these cases.

/// Result of a custom action
class ActionResult {
  final bool success;
  final String? message;
  final String? error;
  final dynamic data;

  const ActionResult({
    required this.success,
    this.message,
    this.error,
    this.data,
  });

  Map<String, dynamic> toJson() => {
        'success': success,
        if (message != null) 'message': message,
        if (error != null) 'error': error,
        if (data != null) 'data': data,
      };
}

typedef CustomActionHandler = Future<ActionResult> Function([String? value]);
typedef ActionsChangeListener = void Function();

/// Singleton registry for custom actions
class CustomActionsRegistry {
  static final CustomActionsRegistry _instance =
      CustomActionsRegistry._internal();
  factory CustomActionsRegistry() => _instance;
  CustomActionsRegistry._internal();

  final Map<String, CustomActionHandler> _actions = {};
  final Set<ActionsChangeListener> _listeners = {};

  /// Register a custom action
  /// Returns a function to unregister
  void Function() register(String name, CustomActionHandler handler) {
    _actions[name] = handler;
    _notifyChange();
    return () => unregister(name);
  }

  /// Unregister a custom action
  void unregister(String name) {
    _actions.remove(name);
    _notifyChange();
  }

  /// Execute a custom action
  Future<ActionResult> execute(String name, [String? value]) async {
    final handler = _actions[name];
    if (handler == null) {
      return ActionResult(
        success: false,
        error: 'Unknown custom action: $name',
      );
    }
    try {
      return await handler(value);
    } catch (err) {
      return ActionResult(
        success: false,
        error: err.toString(),
      );
    }
  }

  /// Check if action exists
  bool has(String name) => _actions.containsKey(name);

  /// List all action names
  List<String> list() => _actions.keys.toList();

  /// Subscribe to changes
  void Function() onChange(ActionsChangeListener listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _notifyChange() {
    for (final listener in _listeners) {
      listener();
    }
  }
}

/// Global custom actions instance
final customActions = CustomActionsRegistry();

/// Convenience function to register a custom action
void Function() registerCustomAction(
    String name, CustomActionHandler handler) {
  return customActions.register(name, handler);
}
