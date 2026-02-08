#!/usr/bin/env node
/**
 * Autonomo MCP Server CLI
 *
 * WebSocket mode (RECOMMENDED - apps connect directly):
 *   autonomo-mcp
 *   autonomo-mcp --port 9876
 *
 * Legacy HTTP mode (apps expose endpoints):
 *   autonomo-mcp --url http://localhost:8080/autonomo
 *   autonomo-mcp --multi --bridge http://localhost:3000/autonomo
 */

import { startServer } from './index.js';
import { startMultiBridgeServer, type BridgeConfig } from './multi-bridge.js';
import { startWSModeServer } from './ws-mode.js';
import { closeWSServer } from './ws-server.js';

// Graceful shutdown handler
function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    console.error(`\n${signal} received, shutting down gracefully...`);
    closeWSServer();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

setupGracefulShutdown();

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const index = args.findIndex((a) => a === `--${name}` || a === `-${name[0]}`);
  if (index === -1) return undefined;
  return args[index + 1];
}

function getAllArgs(name: string): string[] {
  const results: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}` || args[i] === `-${name[0]}`) {
      if (args[i + 1]) {
        results.push(args[i + 1]);
      }
    }
  }
  return results;
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`) || args.includes(`-${name[0]}`);
}

const isMultiBridge = hasFlag('multi');
const isHttpMode = hasFlag('http');
const url = getArg('url') ?? process.env.AUTONOMO_URL;
const port = parseInt(getArg('port') || '9876', 10);
const bridgeUrls = getAllArgs('bridge');

// Default to WebSocket mode (simplest)
if (!isHttpMode && !url && !isMultiBridge) {
  // WebSocket mode - apps connect directly
  console.error('Autonomo MCP Server starting (WebSocket mode)...');
  console.error(`Apps connect to: ws://localhost:${port}`);
  
  startWSModeServer({ port }).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
} else if (isMultiBridge) {
  // Multi-bridge HTTP mode (legacy)
  console.error('Autonomo MCP Server starting (multi-bridge HTTP mode)...');

  const bridges: BridgeConfig[] = bridgeUrls.map((bridgeUrl) => ({
    url: bridgeUrl,
  }));

  if (bridges.length > 0) {
    console.error(`Initial bridges: ${bridges.map((b) => b.url).join(', ')}`);
  } else {
    console.error('No initial bridges. Use autonomo_register_bridge to add apps.');
  }

  startMultiBridgeServer({ bridges }).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
} else if (url) {
  // Single-app HTTP mode (legacy)
  console.error('Autonomo MCP Server starting (single-app HTTP mode)...');
  console.error(`App URL: ${url}`);

  startServer({ appUrl: url }).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
