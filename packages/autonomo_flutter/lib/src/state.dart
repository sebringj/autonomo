/// State Manager - Tracks and reports application state
///
/// Collects state from multiple sources into a unified snapshot
/// that the AI can use to understand the application.

import 'registry.dart';
import 'actions.dart';
import 'instance.dart';

/// User context information
class UserContext {
  final String? id;
  final String? email;
  final String? role;
  final Map<String, dynamic> extra;

  const UserContext({
    this.id,
    this.email,
    this.role,
    this.extra = const {},
  });

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        if (email != null) 'email': email,
        if (role != null) 'role': role,
        ...extra,
      };
}

/// Network request information
class NetworkRequest {
  final String method;
  final String url;
  final int? status;
  final int? duration;
  final String? error;

  const NetworkRequest({
    required this.method,
    required this.url,
    this.status,
    this.duration,
    this.error,
  });

  Map<String, dynamic> toJson() => {
        'method': method,
        'url': url,
        if (status != null) 'status': status,
        if (duration != null) 'duration': duration,
        if (error != null) 'error': error,
      };
}

/// Suggested action in a flow
class SuggestedAction {
  /// Action to perform: press, fillIn, navigate, custom
  final String action;
  /// Target element ID or route
  final String target;
  /// Optional value for fillIn or custom actions
  final String? value;
  /// Human-readable description of this step
  final String? description;

  const SuggestedAction({
    required this.action,
    required this.target,
    this.value,
    this.description,
  });

  Map<String, dynamic> toJson() => {
        'action': action,
        'target': target,
        if (value != null) 'value': value,
        if (description != null) 'description': description,
      };
}

/// Complete application state snapshot
class AppState {
  final String screen;
  final int timestamp;
  final InstanceInfo? instance;
  final UserContext? user;
  /// Screen-level hint for AI agents.
  /// Provides context about what this screen is for and how to use it.
  final String? screenHint;
  /// Suggested flow of actions for this screen.
  /// Helps AI understand the typical workflow.
  final List<SuggestedAction>? suggestedFlow;
  final List<ElementInfo> elements;
  final List<String> customActions;
  final Map<String, dynamic>? data;
  final List<String> errors;
  final List<String> logs;
  final List<String> renderErrors;
  final List<NetworkRequest>? network;

  const AppState({
    required this.screen,
    required this.timestamp,
    this.instance,
    this.user,
    this.screenHint,
    this.suggestedFlow,
    required this.elements,
    required this.customActions,
    this.data,
    required this.errors,
    required this.logs,
    required this.renderErrors,
    this.network,
  });

  Map<String, dynamic> toJson() => {
        'screen': screen,
        'timestamp': timestamp,
        if (instance != null) 'instance': instance!.toJson(),
        if (user != null) 'user': user!.toJson(),
        if (screenHint != null) 'screenHint': screenHint,
        if (suggestedFlow != null)
          'suggestedFlow': suggestedFlow!.map((s) => s.toJson()).toList(),
        'elements': elements.map((e) => e.toJson()).toList(),
        'customActions': customActions,
        if (data != null) 'data': data,
        'errors': errors,
        'logs': logs,
        'renderErrors': renderErrors,
        if (network != null)
          'network': network!.map((n) => n.toJson()).toList(),
      };
}

typedef StateChangeListener = void Function(AppState state);

/// Singleton state manager
class StateManager {
  static final StateManager _instance = StateManager._internal();
  factory StateManager() => _instance;
  StateManager._internal() {
    // Forward registry changes to state listeners
    registry.onChange(() => notifyChange());
    customActions.onChange(() => notifyChange());
  }

  String _screen = 'unknown';
  String? _screenHint;
  List<SuggestedAction>? _suggestedFlow;
  UserContext? _user;
  Map<String, dynamic> _data = {};
  final List<String> _errors = [];
  final List<String> _logs = [];
  final List<String> _renderErrors = [];
  final List<NetworkRequest> _network = [];
  final Set<StateChangeListener> _listeners = {};

  static const int _maxErrors = 50;
  static const int _maxLogs = 100;
  static const int _maxNetwork = 50;

  /// Set current screen/route
  /// Clears screen-specific hints when screen changes
  void setScreen(String screen) {
    _screen = screen;
    _screenHint = null;
    _suggestedFlow = null;
    notifyChange();
  }

  /// Get current screen
  String getScreen() => _screen;

  /// Set screen-level hint for AI agents.
  /// Provides context about what this screen is for and how to use it.
  void setScreenHint(String? hint) {
    _screenHint = hint;
    notifyChange();
  }

  /// Set suggested flow of actions for the current screen.
  /// Helps AI understand the typical workflow.
  void setSuggestedFlow(List<SuggestedAction>? flow) {
    _suggestedFlow = flow;
    notifyChange();
  }

  /// Set screen with optional hint and suggested flow.
  /// Convenience method to set all screen context at once.
  void setScreenContext(String screen, {String? hint, List<SuggestedAction>? flow}) {
    _screen = screen;
    _screenHint = hint;
    _suggestedFlow = flow;
    notifyChange();
  }

  /// Set user context
  void setUser(UserContext? user) {
    _user = user;
    notifyChange();
  }

  /// Set application data
  void setData(Map<String, dynamic> data) {
    _data = data;
    notifyChange();
  }

  /// Merge data into existing
  void mergeData(Map<String, dynamic> data) {
    _data = {..._data, ...data};
    notifyChange();
  }

  /// Add an error
  void addError(String error) {
    _errors.add(error);
    if (_errors.length > _maxErrors) {
      _errors.removeRange(0, _errors.length - _maxErrors);
    }
    notifyChange();
  }

  /// Add a log entry
  void addLog(String log) {
    _logs.add(log);
    if (_logs.length > _maxLogs) {
      _logs.removeRange(0, _logs.length - _maxLogs);
    }
  }

  /// Add a render error
  void addRenderError(String error) {
    _renderErrors.add(error);
    if (_renderErrors.length > _maxErrors) {
      _renderErrors.removeRange(0, _renderErrors.length - _maxErrors);
    }
    notifyChange();
  }

  /// Add a network request
  void addNetworkRequest(NetworkRequest request) {
    _network.add(request);
    if (_network.length > _maxNetwork) {
      _network.removeRange(0, _network.length - _maxNetwork);
    }
  }

  /// Clear errors
  void clearErrors() {
    _errors.clear();
    _renderErrors.clear();
    notifyChange();
  }

  /// Clear logs
  void clearLogs() {
    _logs.clear();
  }

  /// Clear network history
  void clearNetwork() {
    _network.clear();
  }

  /// Get current state snapshot
  AppState getState() {
    return AppState(
      screen: _screen,
      timestamp: DateTime.now().millisecondsSinceEpoch,
      instance: getInstance(),
      user: _user,
      screenHint: _screenHint,
      suggestedFlow: _suggestedFlow,
      elements: registry.getAll(),
      customActions: customActions.list(),
      data: _data.isNotEmpty ? _data : null,
      errors: List.unmodifiable(_errors),
      logs: List.unmodifiable(_logs),
      renderErrors: List.unmodifiable(_renderErrors),
      network: _network.isNotEmpty ? List.unmodifiable(_network) : null,
    );
  }

  /// Subscribe to state changes
  void Function() onChange(StateChangeListener listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  /// Trigger a state update notification
  void notifyChange() {
    final state = getState();
    for (final listener in _listeners) {
      listener(state);
    }
  }
}

/// Global state manager instance
final state = StateManager();
