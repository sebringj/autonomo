#!/usr/bin/env node
/**
 * Autonomo MCP Server CLI
 *
 * Single-app mode:
 *   autonomo-mcp --url http://localhost:8080/autonomo
 *
 * Multi-bridge mode (no URL required, register bridges dynamically):
 *   autonomo-mcp --multi
 *
 * Multi-bridge with initial bridges:
 *   autonomo-mcp --multi --bridge http://localhost:3000/autonomo --bridge http://localhost:8081/autonomo
 */

import { startServer } from './index.js';
import { startMultiBridgeServer, type BridgeConfig } from './multi-bridge.js';

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
const url = getArg('url') ?? process.env.AUTONOMO_URL;
const bridgeUrls = getAllArgs('bridge');

if (isMultiBridge) {
  // Multi-bridge mode
  console.error('Autonomo MCP Server starting (multi-bridge mode)...');

  const bridges: BridgeConfig[] = bridgeUrls.map((bridgeUrl, index) => ({
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
} else {
  // Single-app mode (legacy)
  if (!url) {
    console.error('Error: Missing app URL');
    console.error('');
    console.error('Usage:');
    console.error('  Single-app mode:');
    console.error('    autonomo-mcp --url <app-autonomo-url>');
    console.error('');
    console.error('  Multi-bridge mode:');
    console.error('    autonomo-mcp --multi');
    console.error('    autonomo-mcp --multi --bridge http://localhost:3000/autonomo');
    console.error('');
    console.error('Example:');
    console.error('  autonomo-mcp --url http://localhost:8080/autonomo');
    console.error('');
    console.error('Or set AUTONOMO_URL environment variable:');
    console.error('  AUTONOMO_URL=http://localhost:8080/autonomo autonomo-mcp');
    process.exit(1);
  }

  console.error('Autonomo MCP Server starting (single-app mode)...');
  console.error(`App URL: ${url}`);

  startServer({ appUrl: url }).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
