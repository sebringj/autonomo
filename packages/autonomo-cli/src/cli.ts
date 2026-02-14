#!/usr/bin/env node
/**
 * Autonomo CLI
 * 
 * Commands:
 *   autonomo serve   Start the MCP server (WebSocket mode)
 */

import { startWSModeServer } from '@autonomo/mcp-server';

const args = process.argv.slice(2);
const command = args[0];

function getArg(name: string): string | undefined {
  const index = args.findIndex(a => a === `--${name}` || a === `-${name[0]}`);
  if (index === -1) return undefined;
  return args[index + 1];
}

function printUsage(): void {
  console.log(`
Autonomo CLI - AI-powered application testing

Usage:
  autonomo <command> [options]

Commands:
  serve   Start the MCP server (WebSocket mode)

Options:
  --port, -p   WebSocket port (default: 9876 or AUTONOMO_PORT env)
  --help, -h   Show this help message

Examples:
  autonomo serve
  autonomo serve --port 9877
  AUTONOMO_PORT=9877 autonomo serve

Environment Variables:
  AUTONOMO_PORT   WebSocket server port (default: 9876)

For more information, visit: https://github.com/sebringj/autonomo
`);
}

async function main(): Promise<void> {
  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  const portArg = getArg('port');
  if (portArg) {
    process.env.AUTONOMO_PORT = portArg;
  }

  switch (command) {
    case 'serve':
      console.log(`Starting Autonomo MCP server (WebSocket mode)...`);
      console.log(`Port: ${process.env.AUTONOMO_PORT || 9876}`);
      console.log('');
      await startWSModeServer();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
