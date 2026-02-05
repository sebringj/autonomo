#!/usr/bin/env node
/**
 * Autonomo MCP Server CLI
 * 
 * Usage: autonomo-mcp --url http://localhost:8080/autonomo
 */

import { startServer } from './index.js';

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const index = args.findIndex(a => a === `--${name}` || a === `-${name[0]}`);
  if (index === -1) return undefined;
  return args[index + 1];
}

const url = getArg('url') ?? process.env.AUTONOMO_URL;

if (!url) {
  console.error('Error: Missing app URL');
  console.error('');
  console.error('Usage: autonomo-mcp --url <app-autonomo-url>');
  console.error('');
  console.error('Example:');
  console.error('  autonomo-mcp --url http://localhost:8080/autonomo');
  console.error('');
  console.error('Or set AUTONOMO_URL environment variable:');
  console.error('  AUTONOMO_URL=http://localhost:8080/autonomo autonomo-mcp');
  process.exit(1);
}

console.error(`Autonomo MCP Server starting...`);
console.error(`App URL: ${url}`);

startServer({ appUrl: url }).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
