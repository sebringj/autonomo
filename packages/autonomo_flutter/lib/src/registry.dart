/// Element Registry - Tracks interactive elements for AI control
///
/// Widgets register themselves when mounted, unregister when disposed.
/// This provides a live map of what the AI can interact with.

/// Type of interactive element
enum ElementType {
  button,
  input,
  toggle,
  select,
  link,
  custom,
}

/// Handler for an interactive element
class ElementHandler {
  final ElementType type;
  final Future<void> Function([String? value]) handler;
  final bool disabled;
  final String? Function()? getValue;
  final Future<void> Function()? onSubmit;
  final String? hint;
  final Map<String, dynamic>? meta;

  const ElementHandler({
    required this.type,
    required this.handler,
    this.disabled = false,
    this.getValue,
    this.onSubmit,
    this.hint,
    this.meta,
  });
}

/// Information about a registered element
class ElementInfo {
  final String id;
  final ElementType type;
  final bool disabled;
  final String? value;
  final String? hint;
  final Map<String, dynamic>? meta;

  const ElementInfo({
    required this.id,
    required this.type,
    this.disabled = false,
    this.value,
    this.hint,
    this.meta,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        if (disabled) 'disabled': disabled,
        if (value != null) 'value': value,
        if (hint != null) 'hint': hint,
        if (meta != null) 'meta': meta,
      };
}

typedef RegistryChangeListener = void Function();

/// Singleton registry for all interactive elements
class ElementRegistry {
  static final ElementRegistry _instance = ElementRegistry._internal();
  factory ElementRegistry() => _instance;
  ElementRegistry._internal();

  final Map<String, ElementHandler> _elements = {};
  final Set<RegistryChangeListener> _listeners = {};

  /// Register an interactive element
  /// Returns a function to unregister
  void Function() register(String id, ElementHandler handler) {
    _elements[id] = handler;
    _notifyChange();
    return () => unregister(id);
  }

  /// Unregister an element
  void unregister(String id) {
    _elements.remove(id);
    _notifyChange();
  }

  /// Get handler for an element
  ElementHandler? get(String id) => _elements[id];

  /// Check if element exists
  bool has(String id) => _elements.containsKey(id);

  /// List all element IDs
  List<String> list() => _elements.keys.toList();

  /// Get detailed info for all elements
  List<ElementInfo> getAll() {
    return _elements.entries.map((entry) {
      final handler = entry.value;
      return ElementInfo(
        id: entry.key,
        type: handler.type,
        disabled: handler.disabled,
        value: handler.getValue?.call(),
        hint: handler.hint,
        meta: handler.meta,
      );
    }).toList();
  }

  /// Find elements matching a pattern
  List<ElementInfo> find(RegExp pattern) {
    return getAll().where((el) => pattern.hasMatch(el.id)).toList();
  }

  /// Clear all elements
  void clear() {
    _elements.clear();
    _notifyChange();
  }

  /// Get count of registered elements
  int get size => _elements.length;

  /// Subscribe to registry changes
  void Function() onChange(RegistryChangeListener listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _notifyChange() {
    for (final listener in _listeners) {
      listener();
    }
  }
}

/// Global registry instance
final registry = ElementRegistry();

/// Register a tap handler for a widget
void Function() registerTapHandler(
  String id,
  Future<void> Function() handler, {
  bool disabled = false,
  String? hint,
  Map<String, dynamic>? meta,
}) {
  return registry.register(
    id,
    ElementHandler(
      type: ElementType.button,
      handler: ([_]) => handler(),
      disabled: disabled,
      hint: hint,
      meta: meta,
    ),
  );
}

/// Register a fill handler for a text input
void Function() registerFillHandler(
  String id,
  Future<void> Function(String value) handler, {
  String? Function()? getValue,
  Future<void> Function()? onSubmit,
  bool disabled = false,
  String? hint,
  Map<String, dynamic>? meta,
}) {
  return registry.register(
    id,
    ElementHandler(
      type: ElementType.input,
      handler: ([value]) => handler(value ?? ''),
      getValue: getValue,
      onSubmit: onSubmit,
      disabled: disabled,
      hint: hint,
      meta: meta,
    ),
  );
}

/// Register a toggle handler for a switch/checkbox
void Function() registerToggleHandler(
  String id,
  Future<void> Function([String? value]) handler, {
  String? Function()? getValue,
  bool disabled = false,
  String? hint,
  Map<String, dynamic>? meta,
}) {
  return registry.register(
    id,
    ElementHandler(
      type: ElementType.toggle,
      handler: handler,
      getValue: getValue,
      disabled: disabled,
      hint: hint,
      meta: meta,
    ),
  );
}
