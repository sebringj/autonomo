#!/usr/bin/env node
/**
 * Autonomo CLI
 * 
 * Commands:
 *   autonomo serve --url <app-url>   Start the MCP server
 *   autonomo check --url <app-url>   Check if app is reachable
 *   autonomo state --url <app-url>   Get current app state
 */

import { AutonomoClient, startServer } from '@autonomo/mcp-server';

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
  serve   Start the MCP server for AI tools
  check   Check if the application is reachable
  state   Get current application state

Options:
  --url, -u    Application's Autonomo endpoint URL
  --help, -h   Show this help message

Examples:
  autonomo serve --url http://localhost:8080/autonomo
  autonomo check --url http://localhost:8080/autonomo
  autonomo state --url http://localhost:8080/autonomo

Environment Variables:
  AUTONOMO_URL    Default application URL

For more information, visit: https://github.com/sebringj/autonomo
`);
}

async function main(): Promise<void> {
  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  const url = getArg('url') ?? process.env.AUTONOMO_URL;

  if (!url) {
    console.error('Error: Missing --url option or AUTONOMO_URL environment variable');
    console.error('');
    console.error('Usage: autonomo <command> --url <app-autonomo-url>');
    process.exit(1);
  }

  const client = new AutonomoClient(url);

  switch (command) {
    case 'serve':
      console.log(`Starting Autonomo MCP server...`);
      console.log(`App URL: ${url}`);
      console.log('');
      console.log('Add this to your VS Code settings (or claude_desktop_config.json):');
      console.log('');
      console.log(JSON.stringify({
        "mcpServers": {
          "autonomo": {
            "command": "npx",
            "args": ["autonomo", "serve", "--url", url]
          }
        }
      }, null, 2));
      console.log('');
      await startServer({ appUrl: url });
      break;

    case 'check':
      console.log(`Checking connection to ${url}...`);
      const healthy = await client.health();
      if (healthy) {
        console.log('✓ Application is reachable');
        process.exit(0);
      } else {
        console.log('✗ Application is not reachable');
        process.exit(1);
      }
      break;

    case 'state':
      console.log(`Getting state from ${url}...`);
      console.log('');
      try {
        const result = await client.getState();
        console.log(JSON.stringify(result.state, null, 2));
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
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
