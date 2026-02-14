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

  static ActionResult ok([String? message, dynamic data]) => ActionResult(
        success: true,
        message: message,
        data: data,
      );

  static ActionResult fail(String error, [dynamic data]) => ActionResult(
        success: false,
        error: error,
        data: data,
      );

  Map<String, dynamic> toJson() => {
        'success': success,
        if (message != null) 'message': message,
        if (error != null) 'error': error,
        if (data != null) 'data': data,
      };
}

/// Metadata for a custom action - helps AI understand what it does
class CustomActionMeta {
  final String? description;
  final Map<String, String>? args;
  final Map<String, String>? example;

  const CustomActionMeta({
    this.description,
    this.args,
    this.example,
  });
}

/// Rich custom action info returned in state
class CustomActionInfo {
  final String name;
  final String? description;
  final Map<String, String>? args;
  final Map<String, String>? example;

  const CustomActionInfo({
    required this.name,
    this.description,
    this.args,
    this.example,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        if (description != null) 'description': description,
        if (args != null) 'args': args,
        if (example != null) 'example': example,
      };
}

/// Internal registered action
class _RegisteredAction {
  final CustomActionHandler handler;
  final CustomActionMeta? meta;

  const _RegisteredAction({required this.handler, this.meta});
}

typedef CustomActionHandler = Future<ActionResult> Function([String? value]);
typedef ActionsChangeListener = void Function();

/// Singleton registry for custom actions
class CustomActionsRegistry {
  static final CustomActionsRegistry _instance =
      CustomActionsRegistry._internal();
  factory CustomActionsRegistry() => _instance;
  CustomActionsRegistry._internal();

  final Map<String, _RegisteredAction> _actions = {};
  final Set<ActionsChangeListener> _listeners = {};

  /// Register a custom action
  /// Returns a function to unregister
  void Function() register(String name, CustomActionHandler handler,
      {CustomActionMeta? meta}) {
    _actions[name] = _RegisteredAction(handler: handler, meta: meta);
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
    final action = _actions[name];
    if (action == null) {
      final available = _actions.isEmpty ? 'none' : _actions.keys.join(', ');
      return ActionResult(
        success: false,
        error: 'Unknown custom action: $name. Available: $available',
      );
    }
    try {
      return await action.handler(value);
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

  /// Clear all custom actions
  void clear() {
    _actions.clear();
    _notifyChange();
  }

  /// Get rich info about all actions (for AI discoverability)
  List<CustomActionInfo> getAll() {
    return _actions.entries.map((entry) {
      return CustomActionInfo(
        name: entry.key,
        description: entry.value.meta?.description,
        args: entry.value.meta?.args,
        example: entry.value.meta?.example,
      );
    }).toList();
  }

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
void Function() registerCustomAction(String name, CustomActionHandler handler,
    {CustomActionMeta? meta}) {
  return customActions.register(name, handler, meta: meta);
}
