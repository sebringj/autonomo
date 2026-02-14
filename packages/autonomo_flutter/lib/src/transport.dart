/// Transport - HTTP server utilities (optional)
///
/// WebSocket is the primary communication mode for Autonomo.
/// These helpers are kept for custom integrations and backward compatibility.

import 'dart:convert';
import 'dart:io';

import 'commands.dart';
import 'state.dart' as app_state;

/// Check if running in development mode.
/// Returns true unless explicitly in production environment.
bool isDevMode() {
  // Check common environment variables
  final env = Platform.environment['ENV'] ??
      Platform.environment['ENVIRONMENT'] ??
      Platform.environment['APP_ENV'] ??
      '';
  if (env.toLowerCase() == 'production' || env.toLowerCase() == 'prod') {
    return false;
  }

  final nodeEnv = Platform.environment['NODE_ENV'] ?? '';
  if (nodeEnv.toLowerCase() == 'production') {
    return false;
  }

  // Check for DEBUG flag
  if (Platform.environment['DEBUG'] != null) {
    return true;
  }

  // Check Flutter's kReleaseMode if available (handled at call site)
  return true;
}

/// Configuration for the Autonomo transport
class TransportConfig {
  final int port;
  final String host;
  final bool cors;

  /// Only enable in development mode (default: true)
  final bool devOnly;
  final void Function(String url)? onStart;
  final void Function(String command, String? target, String? value)? onCommand;

  const TransportConfig({
    this.port = 8080,
    this.host = '127.0.0.1',
    this.cors = true,
    this.devOnly = true,
    this.onStart,
    this.onCommand,
  });
}

/// Running transport instance
class TransportInstance {
  final String url;
  final HttpServer _server;

  TransportInstance._(this.url, this._server);

  /// Stop the server
  Future<void> stop() async {
    await _server.close();
  }
}

/// Create and start HTTP transport
/// Returns null if devOnly is true and running in production mode.
Future<TransportInstance?> createHttpTransport(TransportConfig config) async {
  // Skip in production if devOnly is true
  if (config.devOnly && !isDevMode()) {
    return null;
  }

  final server = await HttpServer.bind(config.host, config.port);
  final url = 'http://${config.host}:${config.port}';

  server.listen((request) async {
    // Add CORS headers if enabled
    if (config.cors) {
      request.response.headers.add('Access-Control-Allow-Origin', '*');
      request.response.headers
          .add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      request.response.headers
          .add('Access-Control-Allow-Headers', 'Content-Type');
    }

    // Handle preflight
    if (request.method == 'OPTIONS') {
      request.response.statusCode = 200;
      await request.response.close();
      return;
    }

    final result = await handleRequest(
      request.method,
      request.uri.path,
      request.method == 'POST'
          ? jsonDecode(await utf8.decoder.bind(request).join())
          : null,
    );

    request.response.statusCode = result['status'] as int;
    request.response.headers.contentType = ContentType.json;
    request.response.write(jsonEncode(result['body']));
    await request.response.close();
  });

  config.onStart?.call(url);
  return TransportInstance._(url, server);
}

/// Handle an incoming HTTP request
Future<Map<String, dynamic>> handleRequest(
  String method,
  String path,
  dynamic body,
) async {
  // Health check
  if (method == 'GET' && path == '/health') {
    return {
      'status': 200,
      'body': {
        'status': 'ok',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      },
    };
  }

  // Get current state
  if (method == 'GET' && path == '/state') {
    return {
      'status': 200,
      'body': app_state.state.getState().toJson(),
    };
  }

  // Execute command
  if (method == 'POST' && path == '/command') {
    final command = body['command'] as String?;
    final target = body['target'] as String?;
    final value = body['value'] as String?;

    if (command == null) {
      return {
        'status': 400,
        'body': {'error': 'Missing command field'},
      };
    }

    final result = await executeCommand(command, target, value);
    return {
      'status': result.success ? 200 : 400,
      'body': result.toJson(),
    };
  }

  // Not found
  return {
    'status': 404,
    'body': {'error': 'Not found'},
  };
}
