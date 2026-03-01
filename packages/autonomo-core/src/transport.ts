/**
 * Transport - HTTP server utilities (optional)
 * 
 * NOTE: WebSocket is the primary communication method for Autonomo.
 * These HTTP utilities are provided for custom integrations or testing.
 * Most apps should use the WebSocket connection via useAutonomo() hook.
 */

import { executeCommand, type CommandResult } from './commands.js';
import { state } from './state.js';

export interface TransportConfig {
  /** Port to listen on */
  port: number;
  /** Host to bind to (default: 127.0.0.1) */
  host?: string;
  /** Enable CORS (default: true) */
  cors?: boolean;
  /** Callback when server starts */
  onStart?: (url: string) => void;
  /** Callback when command is received */
  onCommand?: (command: string, target?: string, value?: string) => void;
}

export interface TransportInstance {
  /** Server URL */
  url: string;
  /** Stop the server */
  stop: () => void;
}

/**
 * Create HTTP transport (Node.js/Deno)
 * 
 * For React Native, use a different transport like WebSocket
 * or the Expo fetch bridge.
 */
export function createHttpTransport(
  config: TransportConfig
): Promise<TransportInstance> {
  const { port, host = '127.0.0.1', cors = true, onStart, onCommand } = config;
  const url = `http://${host}:${port}`;

  // This is a placeholder - actual implementation depends on runtime
  // Node.js: use http module
  // Deno: use Deno.serve
  // React Native: typically WebSocket or polled endpoint

  return Promise.resolve({
    url,
    stop: () => {
      // Stop server
    },
  });
}

/**
 * Handle an incoming HTTP request
 * 
 * This can be used to build custom transports for different runtimes.
 */
export async function handleRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; body: unknown }> {
  // Health check
  if (method === 'GET' && path === '/health') {
    return {
      status: 200,
      body: { status: 'ok', timestamp: Date.now() },
    };
  }

  // Get current state
  if (method === 'GET' && path === '/state') {
    return {
      status: 200,
      body: state.getState(),
    };
  }

  // Execute command
  if (method === 'POST' && path === '/command') {
    const { command, target, value } = body as {
      command: string;
      target?: string;
      value?: string;
    };

    if (!command) {
      return {
        status: 400,
        body: { error: 'Missing command field' },
      };
    }

    const result: CommandResult = await executeCommand(command, target, value);
    return {
      status: result.success ? 200 : 400,
      body: result,
    };
  }

  // Not found
  return {
    status: 404,
    body: { error: 'Not found' },
  };
}

/**
 * Create a fetch-based handler for environments that support it
 */
export function createFetchHandler() {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    let body: unknown;
    if (method === 'POST') {
      try {
        body = await request.json();
      } catch {
        body = {};
      }
    }

    const result = await handleRequest(method, path, body);

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  };
}
