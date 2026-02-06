/**
 * Autonomo MCP Server
 * 
 * Provides tools for AI assistants to control applications.
 * Works with GitHub Copilot, Claude Code, Cursor, and any MCP-compatible AI.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { AutonomoClient, type AppState, type CommandResult } from './client.js';

export interface ServerConfig {
  /** URL of the application's Autonomo endpoint */
  appUrl: string;
  /** Server name (default: 'autonomo') */
  name?: string;
  /** Server version (default: '0.1.0') */
  version?: string;
}

/**
 * Create and start the MCP server
 */
export async function createServer(config: ServerConfig): Promise<Server> {
  const { appUrl, name = 'autonomo', version = '0.1.0' } = config;

  const client = new AutonomoClient(appUrl);
  const server = new Server(
    { name, version },
    { capabilities: { tools: {} } }
  );

  // Define available tools
  const tools: Tool[] = [
    {
      name: 'app_get_state',
      description:
        'Get the current application state including screen name, available elements, and any errors. Use this to understand what the user is seeing and what actions are available.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'app_navigate',
      description:
        'Navigate to a specific screen in the application. The screen name should match a route or screen identifier in the app.',
      inputSchema: {
        type: 'object',
        properties: {
          screen: {
            type: 'string',
            description: 'The screen/route to navigate to',
          },
        },
        required: ['screen'],
      },
    },
    {
      name: 'app_press',
      description:
        'Press/tap a button or interactive element. Use app_get_state first to see available element IDs.',
      inputSchema: {
        type: 'object',
        properties: {
          elementId: {
            type: 'string',
            description: 'The ID of the element to press',
          },
        },
        required: ['elementId'],
      },
    },
    {
      name: 'app_fill',
      description:
        'Fill text into an input field. Use app_get_state first to see available input element IDs.',
      inputSchema: {
        type: 'object',
        properties: {
          elementId: {
            type: 'string',
            description: 'The ID of the input element',
          },
          value: {
            type: 'string',
            description: 'The text to enter',
          },
        },
        required: ['elementId', 'value'],
      },
    },
    {
      name: 'app_submit',
      description:
        'Submit an input field (press Enter). Use after filling a field that has a submit action.',
      inputSchema: {
        type: 'object',
        properties: {
          elementId: {
            type: 'string',
            description: 'The ID of the input element to submit',
          },
        },
        required: ['elementId'],
      },
    },
    {
      name: 'app_custom',
      description:
        'Execute a custom action. Custom actions are app-specific operations that handle complex flows like OTP entry. Use app_get_state to see available customActions.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'The name of the custom action',
          },
          value: {
            type: 'string',
            description: 'Optional value to pass to the action',
          },
        },
        required: ['action'],
      },
    },
    {
      name: 'app_wait',
      description:
        'Wait for a specified duration. Use when the app needs time for animations, network requests, or other async operations.',
      inputSchema: {
        type: 'object',
        properties: {
          ms: {
            type: 'number',
            description: 'Milliseconds to wait (default: 1000)',
          },
        },
        required: [],
      },
    },
  ];

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: CommandResult;

      switch (name) {
        case 'app_get_state':
          result = await client.getState();
          break;

        case 'app_navigate':
          result = await client.navigate((args as { screen: string }).screen);
          break;

        case 'app_press':
          result = await client.press((args as { elementId: string }).elementId);
          break;

        case 'app_fill':
          const fillArgs = args as { elementId: string; value: string };
          result = await client.fill(fillArgs.elementId, fillArgs.value);
          break;

        case 'app_submit':
          result = await client.submit((args as { elementId: string }).elementId);
          break;

        case 'app_custom':
          const customArgs = args as { action: string; value?: string };
          result = await client.custom(customArgs.action, customArgs.value);
          break;

        case 'app_wait':
          result = await client.wait((args as { ms?: number }).ms ?? 1000);
          break;

        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Unknown tool: ${name}` }),
              },
            ],
          };
      }

      return {
        content: [
          {
            type: 'text',
            text: formatResult(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Format result for AI consumption
 */
function formatResult(result: CommandResult): string {
  const { success, message, error, state } = result;

  const output: string[] = [];

  if (success) {
    if (message) output.push(`✓ ${message}`);
  } else {
    output.push(`✗ Error: ${error}`);
  }

  output.push('');
  output.push(`Screen: ${state.screen}`);

  if (state.user) {
    output.push(`User: ${state.user.email ?? state.user.id ?? 'logged in'}`);
  }

  if (state.elements.length > 0) {
    output.push('');
    output.push('Available Elements:');
    for (const el of state.elements) {
      let line = `  • ${el.id} (${el.type})`;
      if (el.disabled) line += ' [disabled]';
      if (el.value) line += ` = "${el.value}"`;
      if (el.hint) line += ` -- ${el.hint}`;
      output.push(line);
    }
  }

  if (state.customActions.length > 0) {
    output.push('');
    output.push(`Custom Actions: ${state.customActions.join(', ')}`);
  }

  if (state.errors.length > 0) {
    output.push('');
    output.push('Errors:');
    for (const err of state.errors) {
      output.push(`  ⚠ ${err}`);
    }
  }

  if (state.renderErrors.length > 0) {
    output.push('');
    output.push('Render Errors:');
    for (const err of state.renderErrors) {
      output.push(`  ⚠ ${err}`);
    }
  }

  return output.join('\n');
}

/**
 * Start server with stdio transport
 */
export async function startServer(config: ServerConfig): Promise<void> {
  const server = await createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Single-app exports (legacy)
export { AutonomoClient } from './client.js';
export type { AppState, CommandResult, InstanceInfo } from './client.js';

// Multi-bridge exports (full MCP spec)
export {
  createMultiBridgeServer,
  startMultiBridgeServer,
  BridgeRegistry,
} from './multi-bridge.js';
export type {
  BridgeConfig,
  BridgeInfo,
  ScenarioStep,
  ScenarioResult,
} from './multi-bridge.js';

