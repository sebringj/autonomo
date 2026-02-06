/**
 * Autonomo MCP Server - Multi-Bridge Version
 *
 * Provides the full MCP tools specification from MCP_INTEGRATION.md:
 * - autonomo/list_bridges - List all connected applications
 * - autonomo/get_state - Get state from one or all bridges
 * - autonomo/send_command - Send commands to applications
 * - autonomo/wait_for - Wait for conditions
 * - autonomo/run_scenario - Execute multi-step scenarios
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  BridgeRegistry,
  type BridgeConfig,
  type BridgeInfo,
  type ScenarioStep,
} from './registry.js';

export interface MultiBridgeServerConfig {
  /** Initial bridges to register */
  bridges?: BridgeConfig[];
  /** Server name (default: 'autonomo') */
  name?: string;
  /** Server version (default: '0.1.0') */
  version?: string;
}

/**
 * Create a multi-bridge MCP server
 */
export async function createMultiBridgeServer(
  config: MultiBridgeServerConfig = {}
): Promise<{ server: Server; registry: BridgeRegistry }> {
  const { bridges = [], name = 'autonomo', version = '0.1.0' } = config;

  const registry = new BridgeRegistry(bridges);
  const server = new Server(
    { name, version },
    { capabilities: { tools: {} } }
  );

  // Define the full MCP tools specification
  const tools: Tool[] = [
    // ==========================================
    // autonomo/list_bridges
    // ==========================================
    {
      name: 'autonomo_list_bridges',
      description:
        'List all connected applications (bridges). Returns each bridge\'s ID, name, platform, current screen, element count, and connection status. Use this to see what apps are available to control.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },

    // ==========================================
    // autonomo/get_state
    // ==========================================
    {
      name: 'autonomo_get_state',
      description:
        'Get the current state of an application. Returns screen name, user info, available elements, custom actions, and any errors. Use this to understand what the user is seeing.',
      inputSchema: {
        type: 'object',
        properties: {
          bridge: {
            type: 'string',
            description:
              'Bridge ID to get state from. Use "all" to get state from all bridges.',
          },
        },
        required: ['bridge'],
      },
    },

    // ==========================================
    // autonomo/send_command
    // ==========================================
    {
      name: 'autonomo_send_command',
      description:
        'Send a command to an application. Supported actions: navigate (go to screen), press (tap button), fillIn/fill (enter text), submit (press enter), custom (app-specific action).',
      inputSchema: {
        type: 'object',
        properties: {
          bridge: {
            type: 'string',
            description: 'Bridge ID to send command to',
          },
          action: {
            type: 'string',
            enum: ['navigate', 'press', 'fillIn', 'fill', 'submit', 'custom'],
            description: 'Action type',
          },
          target: {
            type: 'string',
            description:
              'Target element ID or screen name (for navigate). Use get_state to see available element IDs.',
          },
          value: {
            type: 'string',
            description: 'Value for fillIn action or custom action parameter',
          },
          waitFor: {
            type: 'string',
            description:
              'Optional condition to wait for after command. Format: "screen:name", "element:id", or "data:key"',
          },
        },
        required: ['bridge', 'action', 'target'],
      },
    },

    // ==========================================
    // autonomo/wait_for
    // ==========================================
    {
      name: 'autonomo_wait_for',
      description:
        'Wait for a condition to become true. Use after commands that trigger async operations. Conditions: "screen:name" (wait for screen), "element:id" (wait for element), "data:key" (wait for data), "noError" (wait for errors to clear).',
      inputSchema: {
        type: 'object',
        properties: {
          bridge: {
            type: 'string',
            description: 'Bridge ID',
          },
          condition: {
            type: 'string',
            description:
              'Condition to wait for. Format: "screen:home", "element:Dashboard.Stats", "data:isLoaded", "noError"',
          },
          timeout: {
            type: 'number',
            description: 'Maximum wait time in milliseconds (default: 5000)',
          },
        },
        required: ['bridge', 'condition'],
      },
    },

    // ==========================================
    // autonomo/run_scenario
    // ==========================================
    {
      name: 'autonomo_run_scenario',
      description:
        'Execute a multi-step test scenario. Each step is an action like navigate, press, fillIn, waitFor. Returns timing and success for each step. Use for complex flows like login or checkout.',
      inputSchema: {
        type: 'object',
        properties: {
          bridge: {
            type: 'string',
            description: 'Bridge ID',
          },
          scenario: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: [
                    'navigate',
                    'press',
                    'fillIn',
                    'fill',
                    'submit',
                    'custom',
                    'waitFor',
                    'wait',
                  ],
                },
                target: {
                  type: 'string',
                  description: 'Element ID or screen name',
                },
                value: {
                  type: 'string',
                  description: 'Value for fill actions',
                },
                condition: {
                  type: 'string',
                  description: 'Condition for waitFor action',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout for wait actions',
                },
              },
              required: ['action'],
            },
            description: 'Array of steps to execute',
          },
          stopOnError: {
            type: 'boolean',
            description: 'Stop execution on first error (default: true)',
          },
        },
        required: ['bridge', 'scenario'],
      },
    },

    // ==========================================
    // autonomo/register_bridge
    // ==========================================
    {
      name: 'autonomo_register_bridge',
      description:
        'Register a new application bridge by URL. The app will be queried for its identity. Use this to connect to an app running locally.',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description:
              'URL of the Autonomo endpoint (e.g., http://localhost:3000/autonomo)',
          },
          id: {
            type: 'string',
            description: 'Optional custom bridge ID (auto-generated if omitted)',
          },
          name: {
            type: 'string',
            description: 'Optional human-readable name',
          },
          platform: {
            type: 'string',
            enum: ['web', 'mobile', 'desktop'],
            description: 'Optional platform type',
          },
        },
        required: ['url'],
      },
    },

    // ==========================================
    // autonomo/unregister_bridge
    // ==========================================
    {
      name: 'autonomo_unregister_bridge',
      description: 'Unregister (disconnect) an application bridge.',
      inputSchema: {
        type: 'object',
        properties: {
          bridge: {
            type: 'string',
            description: 'Bridge ID to unregister',
          },
        },
        required: ['bridge'],
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
      switch (name) {
        // ==========================================
        // autonomo/list_bridges
        // ==========================================
        case 'autonomo_list_bridges': {
          const bridges = await registry.listBridges();
          return {
            content: [
              {
                type: 'text',
                text: formatBridgeList(bridges),
              },
            ],
          };
        }

        // ==========================================
        // autonomo/get_state
        // ==========================================
        case 'autonomo_get_state': {
          const { bridge } = args as { bridge: string };
          const result = await registry.getState(bridge);

          if (bridge === 'all') {
            return {
              content: [
                {
                  type: 'text',
                  text: formatMultiState(
                    result as Record<string, { success: boolean; state: any; error?: string }>
                  ),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: formatState((result as any).state, bridge),
              },
            ],
          };
        }

        // ==========================================
        // autonomo/send_command
        // ==========================================
        case 'autonomo_send_command': {
          const { bridge, action, target, value, waitFor } = args as {
            bridge: string;
            action: 'navigate' | 'press' | 'fillIn' | 'fill' | 'submit' | 'custom';
            target: string;
            value?: string;
            waitFor?: string;
          };

          const result = await registry.sendCommand(bridge, action, target, value);

          // Optional wait after command
          if (waitFor && result.success) {
            const waitResult = await registry.waitFor(bridge, waitFor, 5000);
            return {
              content: [
                {
                  type: 'text',
                  text: formatCommandResult(result, waitResult),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: formatCommandResult(result),
              },
            ],
          };
        }

        // ==========================================
        // autonomo/wait_for
        // ==========================================
        case 'autonomo_wait_for': {
          const { bridge, condition, timeout } = args as {
            bridge: string;
            condition: string;
            timeout?: number;
          };

          const result = await registry.waitFor(bridge, condition, timeout ?? 5000);

          return {
            content: [
              {
                type: 'text',
                text: formatWaitResult(result, condition),
              },
            ],
          };
        }

        // ==========================================
        // autonomo/run_scenario
        // ==========================================
        case 'autonomo_run_scenario': {
          const { bridge, scenario, stopOnError } = args as {
            bridge: string;
            scenario: ScenarioStep[];
            stopOnError?: boolean;
          };

          const result = await registry.runScenario(
            bridge,
            scenario,
            stopOnError ?? true
          );

          return {
            content: [
              {
                type: 'text',
                text: formatScenarioResult(result),
              },
            ],
          };
        }

        // ==========================================
        // autonomo/register_bridge
        // ==========================================
        case 'autonomo_register_bridge': {
          const { url, id, name: bridgeName, platform } = args as {
            url: string;
            id?: string;
            name?: string;
            platform?: 'web' | 'mobile' | 'desktop';
          };

          let bridgeId: string;
          if (id || bridgeName || platform) {
            // Manual registration
            bridgeId = registry.register({ id, name: bridgeName, url, platform });
          } else {
            // Auto-discovery
            bridgeId = await registry.registerByUrl(url);
          }

          return {
            content: [
              {
                type: 'text',
                text: `✓ Registered bridge: ${bridgeId}\n  URL: ${url}`,
              },
            ],
          };
        }

        // ==========================================
        // autonomo/unregister_bridge
        // ==========================================
        case 'autonomo_unregister_bridge': {
          const { bridge } = args as { bridge: string };
          const removed = registry.unregister(bridge);

          return {
            content: [
              {
                type: 'text',
                text: removed
                  ? `✓ Unregistered bridge: ${bridge}`
                  : `✗ Bridge not found: ${bridge}`,
              },
            ],
          };
        }

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
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `✗ Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return { server, registry };
}

// ==========================================
// Formatting helpers
// ==========================================

function formatBridgeList(bridges: BridgeInfo[]): string {
  if (bridges.length === 0) {
    return 'No bridges registered. Use autonomo_register_bridge to connect an app.';
  }

  const lines: string[] = ['Connected Applications:', ''];

  for (const b of bridges) {
    const status = b.status === 'connected' ? '🟢' : b.status === 'error' ? '🔴' : '⚪';
    lines.push(`${status} ${b.name} (${b.id})`);
    lines.push(`   Platform: ${b.platform}`);
    lines.push(`   URL: ${b.url}`);
    if (b.status === 'connected') {
      lines.push(`   Screen: ${b.screen}`);
      lines.push(`   Elements: ${b.elements}`);
      if (b.instance) {
        lines.push(`   Instance: ${b.instance.instanceId} (created ${new Date(b.instance.createdAt).toLocaleTimeString()})`);
      }
    }
    if (b.error) {
      lines.push(`   Error: ${b.error}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatState(state: any, bridgeId: string): string {
  const lines: string[] = [];

  lines.push(`Bridge: ${bridgeId}`);
  lines.push(`Screen: ${state.screen}`);

  if (state.instance) {
    lines.push(`Instance: ${state.instance.name} (${state.instance.instanceId})`);
  }

  if (state.user) {
    lines.push(`User: ${state.user.email ?? state.user.id ?? 'logged in'}`);
  }

  if (state.elements?.length > 0) {
    lines.push('');
    lines.push('Elements:');
    for (const el of state.elements) {
      let line = `  • ${el.id} (${el.type})`;
      if (el.disabled) line += ' [disabled]';
      if (el.value) line += ` = "${el.value}"`;
      if (el.hint) line += ` -- ${el.hint}`;
      lines.push(line);
    }
  }

  if (state.customActions?.length > 0) {
    lines.push('');
    lines.push(`Custom Actions: ${state.customActions.join(', ')}`);
  }

  if (state.errors?.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const err of state.errors) {
      lines.push(`  ⚠ ${err}`);
    }
  }

  return lines.join('\n');
}

function formatMultiState(
  results: Record<string, { success: boolean; state: any; error?: string }>
): string {
  const lines: string[] = ['State from all bridges:', ''];

  for (const [bridgeId, result] of Object.entries(results)) {
    if (result.success) {
      lines.push(formatState(result.state, bridgeId));
    } else {
      lines.push(`Bridge: ${bridgeId}`);
      lines.push(`  ✗ Error: ${result.error}`);
    }
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

function formatCommandResult(
  result: any,
  waitResult?: { success: boolean; waited: number; error?: string }
): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push(`✓ ${result.message ?? 'Command executed'}`);
    if (result.previousScreen !== result.currentScreen) {
      lines.push(`   Screen: ${result.previousScreen} → ${result.currentScreen}`);
    }
    lines.push(`   Duration: ${result.duration}ms`);
  } else {
    lines.push(`✗ Error: ${result.error}`);
  }

  if (waitResult) {
    lines.push('');
    if (waitResult.success) {
      lines.push(`✓ Wait completed in ${waitResult.waited}ms`);
    } else {
      lines.push(`✗ Wait failed: ${waitResult.error}`);
    }
  }

  return lines.join('\n');
}

function formatWaitResult(
  result: { success: boolean; waited: number; state?: any; error?: string },
  condition: string
): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push(`✓ Condition met: ${condition}`);
    lines.push(`   Waited: ${result.waited}ms`);
    if (result.state) {
      lines.push(`   Current screen: ${result.state.screen}`);
    }
  } else {
    lines.push(`✗ Timeout waiting for: ${condition}`);
    lines.push(`   Waited: ${result.waited}ms`);
    if (result.error) {
      lines.push(`   Error: ${result.error}`);
    }
  }

  return lines.join('\n');
}

function formatScenarioResult(result: any): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push(`✓ Scenario completed successfully`);
  } else {
    lines.push(`✗ Scenario failed: ${result.error}`);
  }

  lines.push(`   Total duration: ${result.totalDuration}ms`);
  lines.push('');
  lines.push('Steps:');

  for (const step of result.steps) {
    const icon = step.success ? '✓' : '✗';
    let line = `  ${step.step}. ${icon} ${step.action} (${step.duration}ms)`;
    if (step.error) {
      line += ` - ${step.error}`;
    }
    lines.push(line);
  }

  if (result.finalState) {
    lines.push('');
    lines.push(`Final screen: ${result.finalState.screen}`);
  }

  return lines.join('\n');
}

/**
 * Start multi-bridge server with stdio transport
 */
export async function startMultiBridgeServer(
  config: MultiBridgeServerConfig = {}
): Promise<void> {
  const { server } = await createMultiBridgeServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export { BridgeRegistry } from './registry.js';
export type { BridgeConfig, BridgeInfo, ScenarioStep, ScenarioResult } from './registry.js';
