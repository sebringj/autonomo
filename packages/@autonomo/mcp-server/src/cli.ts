#!/usr/bin/env node
/**
 * Autonomo MCP Server CLI
 *
 * Apps connect directly via WebSocket:
 *   autonomo-mcp
 *   autonomo-mcp --port 9876
 *   AUTONOMO_PORT=9876 autonomo-mcp
 *
 * The server will automatically find an available port if the default is in use.
 * Apps read the same AUTONOMO_PORT env var to connect.
 */

import { startWSModeServer } from './ws-mode.js';
import { closeWSServer } from './ws-server.js';
import * as net from 'net';

// Graceful shutdown handler
function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    console.error(`\n${signal} received, shutting down gracefully...`);
    closeWSServer();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle stdin close (VS Code MCP stops server by closing stdin)
  process.stdin.on('close', () => shutdown('stdin close'));
  process.stdin.on('end', () => shutdown('stdin end'));
}

setupGracefulShutdown();

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const index = args.findIndex((a) => a === `--${name}` || a === `-${name[0]}`);
  if (index === -1) return undefined;
  return args[index + 1];
}

/**
 * Check if a port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find an available port starting from the given port
 */
async function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`Could not find available port starting from ${startPort}`);
}

const requestedPort = parseInt(getArg('port') || process.env.AUTONOMO_PORT || '9876', 10);

// Start WebSocket mode server
(async () => {
  try {
    const port = await findAvailablePort(requestedPort);
    if (port !== requestedPort) {
      console.error(`Port ${requestedPort} in use, using port ${port}`);
    }
    
    console.error('Autonomo MCP Server starting (WebSocket mode)...');
    console.error(`Apps connect to: ws://localhost:${port}`);
    
    await startWSModeServer({ port });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
