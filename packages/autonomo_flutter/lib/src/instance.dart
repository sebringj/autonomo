/// Instance - Unique identity for this app instance
///
/// Each window/tab/simulator gets a unique instance ID that persists
/// for the lifetime of that instance. This allows the MCP server to
/// distinguish between multiple instances of the same app.

import 'dart:math';

/// Platform type for the instance
enum Platform { web, mobile, desktop }

/// Configuration for initializing an app instance
class InstanceConfig {
  final String name;
  final Platform platform;
  final String? instanceId;
  final String? version;
  final Map<String, dynamic>? meta;

  const InstanceConfig({
    required this.name,
    required this.platform,
    this.instanceId,
    this.version,
    this.meta,
  });
}

/// Information about this app instance
class InstanceInfo {
  final String instanceId;
  final String name;
  final String bridgeId;
  final Platform platform;
  final String? version;
  final int createdAt;
  final Map<String, dynamic>? meta;

  const InstanceInfo({
    required this.instanceId,
    required this.name,
    required this.bridgeId,
    required this.platform,
    this.version,
    required this.createdAt,
    this.meta,
  });

  Map<String, dynamic> toJson() => {
        'instanceId': instanceId,
        'name': name,
        'bridgeId': bridgeId,
        'platform': platform.name,
        'createdAt': createdAt,
        if (version != null) 'version': version,
        if (meta != null) 'meta': meta,
      };
}

/// Singleton instance manager
class InstanceManager {
  static final InstanceManager _instance = InstanceManager._internal();
  factory InstanceManager() => _instance;
  InstanceManager._internal();

  InstanceInfo? _currentInstance;

  /// Generate a short unique ID
  String _generateInstanceId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final random = Random.secure();
    return List.generate(8, (_) => chars[random.nextInt(chars.length)]).join();
  }

  /// Initialize this app instance
  ///
  /// Call once at app startup. Each window/process gets a unique instance ID.
  ///
  /// ```dart
  /// void main() {
  ///   instanceManager.initInstance(InstanceConfig(
  ///     name: 'my-app',
  ///     platform: Platform.mobile,
  ///   ));
  ///   runApp(MyApp());
  /// }
  /// ```
  InstanceInfo initInstance(InstanceConfig config) {
    final instanceId = config.instanceId ?? _generateInstanceId();
    _currentInstance = InstanceInfo(
      instanceId: instanceId,
      name: config.name,
      bridgeId: '${config.name}-$instanceId',
      platform: config.platform,
      version: config.version,
      createdAt: DateTime.now().millisecondsSinceEpoch,
      meta: config.meta,
    );
    print('[Autonomo] Instance initialized: ${_currentInstance!.bridgeId}');
    return _currentInstance!;
  }

  /// Get the current instance info
  InstanceInfo? getInstance() => _currentInstance;

  /// Get the current instance info or throw
  InstanceInfo requireInstance() {
    if (_currentInstance == null) {
      throw StateError('Autonomo instance not initialized. Call initInstance() first.');
    }
    return _currentInstance!;
  }

  /// Get just the bridge ID
  String? getBridgeId() => _currentInstance?.bridgeId;

  /// Reset the instance (mainly for testing)
  void resetInstance() {
    _currentInstance = null;
  }
}

/// Global instance manager singleton
final instanceManager = InstanceManager();

/// Convenience function to initialize instance
InstanceInfo initInstance(InstanceConfig config) => instanceManager.initInstance(config);

/// Convenience function to get instance
InstanceInfo? getInstance() => instanceManager.getInstance();

/// Convenience function to require instance
InstanceInfo requireInstance() => instanceManager.requireInstance();

/// Convenience function to get bridge ID
String? getBridgeId() => instanceManager.getBridgeId();

/// Convenience function to reset instance
void resetInstance() => instanceManager.resetInstance();
