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
import {
  generateGetStateDescription,
  generateSendCommandDescription,
} from './schema.js';

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
    {
      name,
      version,
      description: `Autonomo MCP Server - Control and inspect connected applications (web, mobile, desktop) via AI.

CORE WORKFLOW:
1. autonomo_list_bridges → Discover connected apps
2. autonomo_get_state → Inspect current screen, elements, errors, and custom actions
3. autonomo_send_command → Interact: press buttons, fill inputs, invoke custom actions
4. autonomo_wait_for → Wait for screens, elements, or error-free state
5. autonomo_run_scenario → Execute multi-step test flows

CRITICAL - ALWAYS CALL get_state AFTER COMMANDS:
Commands execute asynchronously. The send_command response confirms delivery, NOT completion.
Errors from API calls, navigation, or data loading appear in the get_state "errors" array AFTER the action completes.
ALWAYS call get_state after send_command to verify the result and check for errors.

ELEMENT VISIBILITY:
Elements appear in state ONLY if the app explicitly registers them via:
• autonomoRegister(id, type, handler) - Direct registration
• useAutonomoElement() hook - React hook for registration
Just adding testID or data-testid does NOT make elements visible to Autonomo.

CUSTOM ACTIONS:
Apps can register ANY custom action (e.g., "addRole", "loginAs", "clearData", "switchRole").
These bypass UI interaction for faster, more reliable testing.
Invoke via: send_command(action="custom", target="actionName", value="optional-param")
`,
    },
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
        'List all connected applications (bridges). Returns each bridge\'s ID, name, platform, current screen, element count, and connection status. Use this first to discover what apps are available to control.',
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
      description: generateGetStateDescription(),
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
      description: generateSendCommandDescription(),
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
              'Target element ID or screen name (for navigate). MUST be an element ID from get_state output.',
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

    // ==========================================
    // autonomo/cross_bridge_scenario
    // ==========================================
    {
      name: 'autonomo_cross_bridge_scenario',
      description:
        'Execute a multi-user/multi-device test scenario across multiple bridges. Each step specifies which bridge to target. Perfect for testing real-time features like chat, notifications, or collaborative editing where User A\'s action should be visible to User B.',
      inputSchema: {
        type: 'object',
        properties: {
          scenario: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                bridge: {
                  type: 'string',
                  description: 'Which bridge (device/user) to execute this step on',
                },
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
                description: {
                  type: 'string',
                  description: 'Human-readable description of this step (e.g., "User A sends message")',
                },
              },
              required: ['bridge', 'action'],
            },
            description: 'Array of steps to execute across bridges. Example: [{bridge: "user-a", action: "press", target: "Chat.SendButton"}, {bridge: "user-b", action: "waitFor", condition: "element:Chat.NewMessage"}]',
          },
          stopOnError: {
            type: 'boolean',
            description: 'Stop execution on first error (default: true)',
          },
        },
        required: ['scenario'],
      },
    },

    // ==========================================
    // autonomo/help
    // ==========================================
    {
      name: 'autonomo_help',
      description:
        `Get comprehensive Autonomo documentation and scenario guides. Call this when you need help understanding how to use Autonomo effectively.

Topics available:
• "overview" - Quick start and core concepts
• "security" - ⚠️ Security & coding guidelines (DRY, error handling) - READ FIRST!
• "elements" - How element registration works (CRITICAL to understand)
• "custom-actions" - Bypassing OTP/OAuth and creating shortcuts
• "multi-device" - Testing across multiple devices/users
• "troubleshooting" - Common issues and solutions
• "scenarios" - Real-world testing patterns
• "best-practices" - Tips for reliable testing

Local Development (sub-topics for focused context):
• "local-development" - Index with decision tree (read first)
• "local-development/vscode-tasks" - VS Code tasks.json patterns
• "local-development/auth-bypass" - Skip OTP/OAuth flows
• "local-development/payments" - Stripe CLI, test cards
• "local-development/databases" - Supabase, Firebase, MongoDB
• "local-development/aws" - LocalStack, DynamoDB, SAM
• "local-development/azure" - Azurite, Functions, Cosmos DB
• "local-development/gcp" - Firestore, Pub/Sub, Spanner
• "local-development/checklist" - AI assistant setup guide

Call without a topic to see the full table of contents.`,
      inputSchema: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: [
              'overview', 'security', 'elements', 'custom-actions', 'multi-device', 
              'troubleshooting', 'scenarios', 'best-practices',
              'local-development',
              'local-development/vscode-tasks',
              'local-development/auth-bypass', 
              'local-development/payments',
              'local-development/email',
              'local-development/notifications',
              'local-development/databases',
              'local-development/realtime',
              'local-development/maps-location',
              'local-development/file-storage',
              'local-development/aws',
              'local-development/azure',
              'local-development/gcp',
              'local-development/ai-llm',
              'local-development/analytics',
              'local-development/checklist'
            ],
            description: 'Help topic to retrieve. Use "local-development" for index, or "local-development/[subtopic]" for specific guides.',
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

        // ==========================================
        // autonomo/cross_bridge_scenario
        // ==========================================
        case 'autonomo_cross_bridge_scenario': {
          interface CrossBridgeStep {
            bridge: string;
            action: 'navigate' | 'press' | 'fillIn' | 'fill' | 'submit' | 'custom' | 'waitFor' | 'wait';
            target?: string;
            value?: string;
            condition?: string;
            timeout?: number;
            description?: string;
          }

          const { scenario, stopOnError = true } = args as {
            scenario: CrossBridgeStep[];
            stopOnError?: boolean;
          };

          const steps: Array<{
            step: number;
            bridge: string;
            action: string;
            description?: string;
            success: boolean;
            duration: number;
            error?: string;
          }> = [];
          const overallStart = Date.now();

          for (let i = 0; i < scenario.length; i++) {
            const step = scenario[i];
            const stepStart = Date.now();

            try {
              // Verify bridge exists
              if (!registry.hasBridge(step.bridge)) {
                throw new Error(`Bridge not found: ${step.bridge}`);
              }

              let success = false;
              let error: string | undefined;

              if (step.action === 'waitFor') {
                const result = await registry.waitFor(
                  step.bridge,
                  step.condition!,
                  step.timeout ?? 5000
                );
                success = result.success;
                error = result.error;
              } else if (step.action === 'wait') {
                await new Promise((resolve) => setTimeout(resolve, step.timeout ?? 1000));
                success = true;
              } else {
                const result = await registry.sendCommand(
                  step.bridge,
                  step.action as 'navigate' | 'press' | 'fillIn' | 'fill' | 'submit' | 'custom',
                  step.target!,
                  step.value
                );
                success = result.success;
                error = result.error;
              }

              const stepDuration = Date.now() - stepStart;

              steps.push({
                step: i + 1,
                bridge: step.bridge,
                action: step.action,
                description: step.description,
                success,
                duration: stepDuration,
                error,
              });

              if (!success && stopOnError) {
                break;
              }
            } catch (e) {
              const stepDuration = Date.now() - stepStart;
              const errorMsg = e instanceof Error ? e.message : String(e);

              steps.push({
                step: i + 1,
                bridge: step.bridge,
                action: step.action,
                description: step.description,
                success: false,
                duration: stepDuration,
                error: errorMsg,
              });

              if (stopOnError) {
                break;
              }
            }
          }

          const totalDuration = Date.now() - overallStart;
          const allPassed = steps.every((s) => s.success);

          return {
            content: [
              {
                type: 'text',
                text: formatCrossBridgeResult(steps, totalDuration, allPassed),
              },
            ],
          };
        }

        // ==========================================
        // autonomo/help
        // ==========================================
        case 'autonomo_help': {
          const { topic } = args as { topic?: string };
          const helpContent = await getHelpContent(topic);

          return {
            content: [
              {
                type: 'text',
                text: helpContent,
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

  // Screen hint provides AI guidance for this specific screen
  if (state.screenHint) {
    lines.push('');
    lines.push(`💡 Hint: ${state.screenHint}`);
  }

  if (state.elements?.length > 0) {
    lines.push('');
    lines.push('Elements:');
    for (const el of state.elements) {
      const actions = Array.isArray(el.actions) ? el.actions.join(', ') : el.type;
      let line = `  • ${el.id} (${actions})`;
      if (el.disabled) line += ' [disabled]';
      if (el.value) line += ` = "${el.value}"`;
      if (el.hint) line += ` -- ${el.hint}`;
      lines.push(line);
    }
  }

  // Show full custom action details (not just names)
  if (state.customActions?.length > 0) {
    lines.push('');
    lines.push('Custom Actions:');
    for (const action of state.customActions) {
      if (typeof action === 'string') {
        lines.push(`  • ${action}`);
      } else {
        let line = `  • ${action.name}`;
        if (action.description) line += ` - ${action.description}`;
        lines.push(line);
        if (action.args) {
          for (const [argName, argDesc] of Object.entries(action.args)) {
            lines.push(`      ${argName}: ${argDesc}`);
          }
        }
      }
    }
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

function formatCrossBridgeResult(
  steps: Array<{
    step: number;
    bridge: string;
    action: string;
    description?: string;
    success: boolean;
    duration: number;
    error?: string;
  }>,
  totalDuration: number,
  allPassed: boolean
): string {
  const lines: string[] = [];

  if (allPassed) {
    lines.push(`✓ Cross-bridge scenario completed successfully`);
  } else {
    const failedStep = steps.find((s) => !s.success);
    lines.push(`✗ Cross-bridge scenario failed at step ${failedStep?.step}`);
  }

  lines.push(`   Total duration: ${totalDuration}ms`);
  lines.push(`   Steps: ${steps.filter((s) => s.success).length}/${steps.length} passed`);
  lines.push('');
  lines.push('Steps:');

  for (const step of steps) {
    const icon = step.success ? '✓' : '✗';
    let line = `  ${step.step}. ${icon} [${step.bridge}] ${step.action}`;
    if (step.description) {
      line += ` - "${step.description}"`;
    }
    line += ` (${step.duration}ms)`;
    if (step.error) {
      lines.push(line);
      lines.push(`      Error: ${step.error}`);
    } else {
      lines.push(line);
    }
  }

  return lines.join('\n');
}

// ==========================================
// Help content fetcher
// ==========================================

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/sebringj/autonomo/main/docs/ai_help';

// Top-level topics
const TOP_LEVEL_TOPICS = ['index', 'overview', 'security', 'elements', 'custom-actions', 'multi-device', 'troubleshooting', 'scenarios', 'best-practices'] as const;

// Local development sub-topics (folder structure)
const LOCAL_DEV_TOPICS = [
  'local-development',
  'local-development/index',
  'local-development/vscode-tasks',
  'local-development/auth-bypass',
  'local-development/payments',
  'local-development/email',
  'local-development/notifications',
  'local-development/databases',
  'local-development/realtime',
  'local-development/maps-location',
  'local-development/file-storage',
  'local-development/aws',
  'local-development/azure',
  'local-development/gcp',
  'local-development/ai-llm',
  'local-development/analytics',
  'local-development/checklist'
] as const;

const ALL_TOPICS = [...TOP_LEVEL_TOPICS, ...LOCAL_DEV_TOPICS] as const;
type HelpTopic = typeof ALL_TOPICS[number];

// Cache for help content
const helpCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getTopicUrl(topic: string): string {
  // Handle local-development folder structure
  if (topic === 'local-development') {
    return `${GITHUB_RAW_BASE}/local-development/index.md`;
  }
  if (topic.startsWith('local-development/')) {
    return `${GITHUB_RAW_BASE}/${topic}.md`;
  }
  // Top-level topics
  return `${GITHUB_RAW_BASE}/${topic}.md`;
}

async function fetchHelpContent(topic: string): Promise<string> {
  const url = getTopicUrl(topic);
  
  // Check cache
  const cached = helpCache.get(topic);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'autonomo-mcp-server'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const content = await response.text();
    
    // Cache the result
    helpCache.set(topic, { content, timestamp: Date.now() });
    
    return content;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return `⚠️ Could not fetch help content from repository.

Error: ${errorMsg}

Please check your internet connection and try again, or view the documentation directly at:
https://github.com/sebringj/autonomo/blob/main/docs/ai_help/${topic === 'local-development' ? 'local-development/index' : topic}.md

Top-level topics:
• overview - Quick start and core concepts
• security - Security practices, DRY, coding guidelines
• elements - How element registration works
• custom-actions - Bypassing OTP/OAuth
• multi-device - Testing across multiple devices
• troubleshooting - Common issues and solutions
• scenarios - Real-world testing patterns
• best-practices - Tips for reliable testing

Local development sub-topics:
• local-development - Index with decision tree
• local-development/auth-bypass - Skip OTP/OAuth
• local-development/payments - Stripe CLI
• local-development/aws - LocalStack, DynamoDB
• local-development/azure - Azurite, Functions
• local-development/gcp - Firestore, Pub/Sub
• local-development/checklist - AI setup guide`;
  }
}

async function getHelpContent(topic?: string): Promise<string> {
  // Default to index if no topic or invalid topic
  if (!topic) {
    return fetchHelpContent('index');
  }
  
  // Check if it's a valid topic
  const isValid = ALL_TOPICS.includes(topic as HelpTopic) || 
    topic.startsWith('local-development/');
  
  if (!isValid) {
    return fetchHelpContent('index');
  }
  
  return fetchHelpContent(topic);
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
