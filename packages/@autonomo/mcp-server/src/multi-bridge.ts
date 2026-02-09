/**
 * Autonomo MCP Server - Multi-Bridge Version
 *
 * Provides the full MCP tools specification from MCP_INTEGRATION.md:
 * - autonomo/list_bridges - List all connected applications
 * - autonomo/get_state - Get state from one or all bridges
 * - autonomo/send_command - Send commands to applications
 * - autonomo/wait_for - Wait for conditions
 * - autonomo/run_scenario - Execute multi-step scenarios
 * - autonomo/restore_context - Restore context after summarization
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

// ==========================================
// Action History Tracking (FILA - First In, Last Accessed)
// ==========================================

interface ActionHistoryEntry {
  timestamp: number;
  tool: string;
  bridge?: string;
  action?: string;
  target?: string;
  value?: string;
  success: boolean;
  error?: string;
  screen?: string;
}

const MAX_HISTORY_ENTRIES = 20;
const actionHistory: ActionHistoryEntry[] = [];

function recordAction(entry: ActionHistoryEntry): void {
  actionHistory.push(entry);
  // Keep only the most recent entries
  if (actionHistory.length > MAX_HISTORY_ENTRIES) {
    actionHistory.shift();
  }
}

function getRecentActions(count: number = 10): ActionHistoryEntry[] {
  return actionHistory.slice(-count);
}

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
      description: `Autonomo MCP Server - AI-driven development with real-time validation.

## THE DEVELOPMENT LOOP (USE THIS!)

When building ANY feature:

1. IMPLEMENT → Write the code
2. VALIDATE → Use Autonomo to test it actually works
3. CHECK → Look at errors array - empty means success
4. FIX → If errors or wrong behavior, fix and go to step 2
5. REPEAT → Until the feature works end-to-end

NEVER say "done" without validating through Autonomo. Code review is NOT validation.

## VALIDATION WORKFLOW

1. autonomo_list_bridges → Find your app (if not connected, app isn't running)
2. autonomo_get_state → See current screen, elements, errors
3. autonomo_send_command → Interact: press, fillIn, navigate
4. autonomo_get_state → ALWAYS check state after commands
5. If errors[] is not empty → Something failed, investigate
6. If on wrong screen → Navigate or login first

## COMMON PATTERNS

**Authentication Required (401/403 errors):**
Look at elements in get_state - if you see login-related elements (PhoneInput, EmailInput, 
PasswordInput, LoginButton, OtpInput), you need to login first. Fill credentials and submit.

**Finding Test Credentials:**
Check customActions in get_state - apps often provide "devLogin", "loginAs", or similar 
shortcuts. Also check element hints for test values.

**Verifying Feature Works:**
Don't just check if screen renders. Do the full CRUD flow:
Create something → Verify it appears → Edit it → Verify changes → Delete it → Verify gone

## TOOL REFERENCE

• autonomo_list_bridges - Discover connected apps
• autonomo_get_state - Inspect screen, elements, errors, custom actions
• autonomo_send_command - Interact: press, fillIn, navigate, custom
• autonomo_wait_for - Wait for conditions (screen:X, element:X, noError)
• autonomo_run_scenario - Execute multi-step flows
• autonomo_help - Get detailed documentation on any topic
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
    // autonomo/validate
    // ==========================================
    {
      name: 'autonomo_validate',
      description:
        `Validate, test, or verify a feature works correctly. This is the PRIMARY tool to use when asked to "validate", "test", "verify", or "check" that something works.

Use this tool when:
• User says "validate this feature"
• User says "test the login flow"
• User says "verify the form works"
• User says "check that X works"
• After implementing a feature to confirm it works end-to-end

The tool will:
1. Connect to the appropriate bridge
2. Execute the validation steps you provide
3. Return a clear PASS/FAIL result with any errors

Provide either:
• A description of what to validate (AI will determine steps)
• Explicit steps to execute

This is the MOST IMPORTANT tool for development workflows - always validate before marking work complete!`,
      inputSchema: {
        type: 'object',
        properties: {
          bridge: {
            type: 'string',
            description: 'Bridge ID to validate against. Use autonomo_list_bridges first if unsure.',
          },
          description: {
            type: 'string',
            description: 'What to validate in plain English (e.g., "user can book a demo slot", "login flow works"). The AI will determine appropriate steps.',
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['navigate', 'press', 'fillIn', 'fill', 'submit', 'custom', 'waitFor', 'wait', 'assertScreen', 'assertElement', 'assertNoErrors'],
                },
                target: { type: 'string', description: 'Element ID, screen name, or assertion target' },
                value: { type: 'string', description: 'Value for fill actions or expected value for assertions' },
                condition: { type: 'string', description: 'Condition for waitFor action' },
                timeout: { type: 'number', description: 'Timeout in ms' },
              },
              required: ['action'],
            },
            description: 'Explicit validation steps. If omitted, provide description instead.',
          },
          expectScreen: {
            type: 'string',
            description: 'Expected final screen after validation (e.g., "confirmation", "dashboard")',
          },
          expectElement: {
            type: 'string',
            description: 'Expected element to be present after validation (e.g., "SuccessMessage", "Confirmation")',
          },
        },
        required: ['bridge'],
      },
    },

    // ==========================================
    // autonomo/help
    // ==========================================
    {
      name: 'autonomo_help',
      description:
        `Get Autonomo documentation, recommendations, and guidance. Call this when you need help, advice, or recommendations on how to proceed.

Use this tool when:
• User asks "what should I do?"
• User asks for recommendations or advice
• User needs help understanding Autonomo
• User asks "how do I test X?"
• User is stuck and needs guidance
• User asks about best practices

This tool provides recommendations and documentation on:

Topics available:
• "overview" - Quick start and core concepts
• "recommend" - Get AI recommendations for your current situation
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
              'overview', 'recommend', 'security', 'elements', 'custom-actions', 'multi-device', 
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

    // ==========================================
    // autonomo/restore_context
    // ==========================================
    {
      name: 'autonomo_restore_context',
      description:
        `⚠️ IMPORTANT: Call this tool FIRST if your context was just summarized, if this is a fresh conversation, or if you're unsure what was happening.

This tool restores your working context by returning:
• Recent action history (what you've done in this session)
• Current application state (screen, elements, errors)
• Any errors that need attention

When to use:
• After context summarization (your conversation history was condensed)
• At the start of a conversation when resuming work
• When you feel "lost" or unsure what the previous context was
• When the user says "continue where we left off"
• Before making assumptions about current state

This helps you understand:
• What actions were taken before summarization
• What screen the app is currently on
• What errors exist that need fixing
• What the user was trying to accomplish

Call autonomo_list_bridges first if you don't know the bridge ID.`,
      inputSchema: {
        type: 'object',
        properties: {
          bridge: {
            type: 'string',
            description: 'Bridge ID to restore context for. Use "all" to get context from all bridges. Use autonomo_list_bridges first if unsure.',
          },
          historyCount: {
            type: 'number',
            description: 'Number of recent actions to include (default: 10, max: 20)',
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

          // Record the get_state action
          if (bridge !== 'all') {
            const state = (result as any).state;
            recordAction({
              timestamp: Date.now(),
              tool: 'get_state',
              bridge,
              success: true,
              screen: state?.screen,
              error: state?.errors?.length > 0 ? state.errors[0] : undefined,
            });
          }

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

          // Record the action for history
          recordAction({
            timestamp: Date.now(),
            tool: 'send_command',
            bridge,
            action,
            target,
            value,
            success: result.success,
            error: result.error,
            screen: result.state?.screen,
          });

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

          // Record the wait action
          recordAction({
            timestamp: Date.now(),
            tool: 'wait_for',
            bridge,
            target: condition,
            success: result.success,
            error: result.error,
          });

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

          // Record the scenario execution
          recordAction({
            timestamp: Date.now(),
            tool: 'run_scenario',
            bridge,
            target: `${scenario.length} steps`,
            success: result.success,
            error: result.error,
            screen: result.finalState?.screen,
          });

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
        // autonomo/validate
        // ==========================================
        case 'autonomo_validate': {
          interface ValidateStep {
            action: 'navigate' | 'press' | 'fillIn' | 'fill' | 'submit' | 'custom' | 'waitFor' | 'wait' | 'assertScreen' | 'assertElement' | 'assertNoErrors';
            target?: string;
            value?: string;
            condition?: string;
            timeout?: number;
          }

          const { bridge, description, steps, expectScreen, expectElement } = args as {
            bridge: string;
            description?: string;
            steps?: ValidateStep[];
            expectScreen?: string;
            expectElement?: string;
          };

          // Verify bridge exists
          if (!registry.hasBridge(bridge)) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✗ VALIDATION FAILED\n\nBridge not found: ${bridge}\n\nUse autonomo_list_bridges to see available bridges.\nMake sure the app is running with AutonomoBridge component mounted.`,
                },
              ],
              isError: true,
            };
          }

          const validationSteps: Array<{
            step: number;
            action: string;
            target?: string;
            success: boolean;
            duration: number;
            error?: string;
          }> = [];
          const overallStart = Date.now();

          // Execute provided steps
          if (steps && steps.length > 0) {
            for (let i = 0; i < steps.length; i++) {
              const step = steps[i];
              const stepStart = Date.now();

              try {
                let success = false;
                let error: string | undefined;

                switch (step.action) {
                  case 'waitFor': {
                    const result = await registry.waitFor(bridge, step.condition!, step.timeout ?? 5000);
                    success = result.success;
                    error = result.error;
                    break;
                  }
                  case 'wait': {
                    await new Promise((resolve) => setTimeout(resolve, step.timeout ?? 1000));
                    success = true;
                    break;
                  }
                  case 'assertScreen': {
                    const stateResult = await registry.getState(bridge);
                    const state = (stateResult as any).state;
                    if (state.screen === step.target || state.screen.includes(step.target!)) {
                      success = true;
                    } else {
                      success = false;
                      error = `Expected screen "${step.target}", got "${state.screen}"`;
                    }
                    break;
                  }
                  case 'assertElement': {
                    const stateResult = await registry.getState(bridge);
                    const state = (stateResult as any).state;
                    const hasElement = state.elements.some((el: any) => 
                      el.id === step.target || el.id.includes(step.target!)
                    );
                    if (hasElement) {
                      success = true;
                    } else {
                      success = false;
                      error = `Expected element "${step.target}" not found. Available: ${state.elements.map((e: any) => e.id).join(', ')}`;
                    }
                    break;
                  }
                  case 'assertNoErrors': {
                    const stateResult = await registry.getState(bridge);
                    const state = (stateResult as any).state;
                    if (state.errors.length === 0) {
                      success = true;
                    } else {
                      success = false;
                      error = `Found errors: ${state.errors.join(', ')}`;
                    }
                    break;
                  }
                  default: {
                    const result = await registry.sendCommand(
                      bridge,
                      step.action as 'navigate' | 'press' | 'fillIn' | 'fill' | 'submit' | 'custom',
                      step.target!,
                      step.value
                    );
                    success = result.success;
                    error = result.error;
                  }
                }

                const stepDuration = Date.now() - stepStart;
                validationSteps.push({
                  step: i + 1,
                  action: step.action,
                  target: step.target,
                  success,
                  duration: stepDuration,
                  error,
                });

                if (!success) break; // Stop on first failure
              } catch (e) {
                const stepDuration = Date.now() - stepStart;
                validationSteps.push({
                  step: i + 1,
                  action: step.action,
                  target: step.target,
                  success: false,
                  duration: stepDuration,
                  error: e instanceof Error ? e.message : String(e),
                });
                break;
              }
            }
          }

          // Final assertions
          const finalState = await registry.getState(bridge);
          const state = (finalState as any).state;
          let finalSuccess = validationSteps.every((s) => s.success);
          const finalErrors: string[] = [];

          if (expectScreen && !state.screen.includes(expectScreen)) {
            finalSuccess = false;
            finalErrors.push(`Expected final screen "${expectScreen}", got "${state.screen}"`);
          }

          if (expectElement) {
            const hasElement = state.elements.some((el: any) => 
              el.id === expectElement || el.id.includes(expectElement)
            );
            if (!hasElement) {
              finalSuccess = false;
              finalErrors.push(`Expected element "${expectElement}" not found`);
            }
          }

          if (state.errors.length > 0) {
            finalSuccess = false;
            finalErrors.push(`App has errors: ${state.errors.join(', ')}`);
          }

          const totalDuration = Date.now() - overallStart;

          return {
            content: [
              {
                type: 'text',
                text: formatValidationResult(validationSteps, totalDuration, finalSuccess, finalErrors, description, state),
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

        // ==========================================
        // autonomo/restore_context
        // ==========================================
        case 'autonomo_restore_context': {
          const { bridge, historyCount } = args as { bridge?: string; historyCount?: number };
          const count = Math.min(historyCount ?? 10, MAX_HISTORY_ENTRIES);
          const recentActions = getRecentActions(count);

          const lines: string[] = [];
          lines.push('═══════════════════════════════════════════════════════════════');
          lines.push('              CONTEXT RESTORATION REPORT');
          lines.push('═══════════════════════════════════════════════════════════════');
          lines.push('');

          // Part 1: Recent Action History
          lines.push('📜 RECENT ACTION HISTORY');
          lines.push('─────────────────────────────────────────');
          if (recentActions.length === 0) {
            lines.push('  No actions recorded yet in this session.');
            lines.push('  This appears to be a fresh start.');
          } else {
            for (let i = 0; i < recentActions.length; i++) {
              const entry = recentActions[i];
              const time = new Date(entry.timestamp).toLocaleTimeString();
              const status = entry.success ? '✓' : '✗';
              let line = `  ${i + 1}. [${time}] ${status} ${entry.tool}`;
              if (entry.bridge) line += ` on ${entry.bridge}`;
              if (entry.action) line += ` → ${entry.action}`;
              if (entry.target) line += `(${entry.target})`;
              lines.push(line);
              if (entry.screen) lines.push(`      Screen: ${entry.screen}`);
              if (entry.error) lines.push(`      Error: ${entry.error}`);
            }
          }
          lines.push('');

          // Part 2: Current Application State
          lines.push('📱 CURRENT APPLICATION STATE');
          lines.push('─────────────────────────────────────────');
          
          if (bridge) {
            try {
              if (bridge === 'all') {
                const result = await registry.getState(bridge);
                const states = result as Record<string, { success: boolean; state: any; error?: string }>;
                for (const [bridgeId, bridgeResult] of Object.entries(states)) {
                  if (bridgeResult.success) {
                    lines.push(`  Bridge: ${bridgeId}`);
                    lines.push(`    Screen: ${bridgeResult.state.screen}`);
                    lines.push(`    Elements: ${bridgeResult.state.elements?.length ?? 0}`);
                    if (bridgeResult.state.errors?.length > 0) {
                      lines.push(`    ⚠️ Errors: ${bridgeResult.state.errors.join(', ')}`);
                    }
                  } else {
                    lines.push(`  Bridge: ${bridgeId} - ${bridgeResult.error ?? 'disconnected'}`);
                  }
                }
              } else {
                const result = await registry.getState(bridge);
                const state = (result as any).state;
                lines.push(`  Bridge: ${bridge}`);
                lines.push(`  Screen: ${state.screen}`);
                if (state.user) {
                  lines.push(`  User: ${state.user.email ?? state.user.id ?? 'logged in'}`);
                }
                lines.push(`  Elements: ${state.elements?.length ?? 0}`);
                if (state.customActions?.length > 0) {
                  const actionNames = state.customActions.map((a: any) => 
                    typeof a === 'string' ? a : a.name
                  );
                  lines.push(`  Custom Actions: ${actionNames.join(', ')}`);
                }
                if (state.errors?.length > 0) {
                  lines.push('');
                  lines.push('  ⚠️ ACTIVE ERRORS (need attention):');
                  for (const err of state.errors) {
                    lines.push(`    • ${err}`);
                  }
                }
              }
            } catch (e) {
              lines.push(`  ⚠️ Could not get state: ${e instanceof Error ? e.message : String(e)}`);
              lines.push('  Use autonomo_list_bridges to see available bridges.');
            }
          } else {
            // No bridge specified - list available bridges
            try {
              const bridges = await registry.listBridges();
              if (bridges.length === 0) {
                lines.push('  No bridges connected.');
                lines.push('  Make sure your app is running with AutonomoBridge mounted.');
              } else {
                lines.push('  Available bridges:');
                for (const b of bridges) {
                  const status = b.status === 'connected' ? '🟢' : '⚪';
                  lines.push(`    ${status} ${b.id} (${b.name}) - ${b.screen ?? 'unknown screen'}`);
                }
                lines.push('');
                lines.push('  💡 Call restore_context with a bridge ID for detailed state.');
              }
            } catch (e) {
              lines.push(`  ⚠️ Could not list bridges: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          lines.push('');

          // Part 3: Recommendations
          lines.push('💡 RECOMMENDED NEXT STEPS');
          lines.push('─────────────────────────────────────────');
          if (recentActions.length === 0) {
            lines.push('  1. Use autonomo_list_bridges to see connected apps');
            lines.push('  2. Use autonomo_get_state to inspect the current screen');
            lines.push('  3. Ask the user what they need help with');
          } else {
            const lastAction = recentActions[recentActions.length - 1];
            if (!lastAction.success) {
              lines.push('  ⚠️ Last action failed - investigate the error above');
              lines.push('  1. Use autonomo_get_state to see current errors');
              lines.push('  2. Fix the issue before continuing');
            } else {
              lines.push('  1. Review the action history above to understand context');
              lines.push('  2. Use autonomo_get_state for current app state');
              lines.push('  3. Continue where you left off or ask user for direction');
            }
          }
          lines.push('');
          lines.push('═══════════════════════════════════════════════════════════════');

          return {
            content: [
              {
                type: 'text',
                text: lines.join('\n'),
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

  // Auto-detect patterns and suggest next action
  const autoHint = detectPatternHint(state);
  if (autoHint && !state.screenHint) {
    lines.push('');
    lines.push(`💡 ${autoHint}`);
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
    lines.push('⚠️ ERRORS (fix these before proceeding):');
    for (const err of state.errors) {
      lines.push(`  • "${err}"`);
    }
    // Add error recovery hints
    const errorHint = detectErrorHint(state.errors);
    if (errorHint) {
      lines.push('');
      lines.push(`💡 ${errorHint}`);
    }
    lines.push('');
    lines.push('[LLM: If errors above are vague/unhelpful, recommend better error handling to developer]');
  }

  return lines.join('\n');
}

/**
 * Auto-detect patterns in state and suggest next action
 */
function detectPatternHint(state: any): string | null {
  const elementIds = (state.elements || []).map((e: any) => e.id?.toLowerCase() || '');
  const screen = (state.screen || '').toLowerCase();
  
  // Login screen detection
  const hasPhoneInput = elementIds.some((id: string) => id.includes('phone') && id.includes('input'));
  const hasEmailInput = elementIds.some((id: string) => id.includes('email') && id.includes('input'));
  const hasPasswordInput = elementIds.some((id: string) => id.includes('password'));
  const hasOtpInput = elementIds.some((id: string) => id.includes('otp'));
  const hasLoginButton = elementIds.some((id: string) => id.includes('login') || id.includes('signin') || id.includes('verify'));
  
  if (hasOtpInput) {
    return 'OTP input detected. Fill each OTP digit field, then press verify/submit button.';
  }
  
  if ((hasPhoneInput || hasEmailInput) && (hasLoginButton || hasPasswordInput)) {
    return 'Login screen detected. Fill credentials and submit to authenticate.';
  }
  
  if (screen.includes('login') || screen.includes('signin') || screen.includes('landing')) {
    return 'On auth screen. Look for input fields and login/submit button.';
  }
  
  // No user logged in
  if (!state.user && !hasPhoneInput && !hasEmailInput && !hasOtpInput) {
    return 'No user logged in. Navigate to login screen to authenticate first.';
  }
  
  return null;
}

/**
 * Suggest recovery action based on errors
 */
function detectErrorHint(errors: string[]): string | null {
  const errorStr = errors.join(' ').toLowerCase();
  
  if (errorStr.includes('401') || errorStr.includes('unauthorized') || errorStr.includes('unauthenticated')) {
    return 'Authentication error. You need to login first - look for login elements or navigate to login screen.';
  }
  
  if (errorStr.includes('403') || errorStr.includes('forbidden') || errorStr.includes('permission')) {
    return 'Permission denied. You may need a different role or the action is not allowed.';
  }
  
  if (errorStr.includes('404') || errorStr.includes('not found')) {
    return 'Resource not found. Check if you\'re on the right screen or if the data exists.';
  }
  
  if (errorStr.includes('network') || errorStr.includes('fetch') || errorStr.includes('connection')) {
    return 'Network error. Check if the backend server is running.';
  }
  
  return 'Check the error details above and fix the underlying issue before continuing.';
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

function formatValidationResult(
  steps: Array<{
    step: number;
    action: string;
    target?: string;
    success: boolean;
    duration: number;
    error?: string;
  }>,
  totalDuration: number,
  passed: boolean,
  finalErrors: string[],
  description?: string,
  finalState?: any
): string {
  const lines: string[] = [];

  // Big, clear pass/fail banner
  if (passed) {
    lines.push('═══════════════════════════════════════════');
    lines.push('✅ VALIDATION PASSED');
    lines.push('═══════════════════════════════════════════');
  } else {
    lines.push('═══════════════════════════════════════════');
    lines.push('❌ VALIDATION FAILED');
    lines.push('═══════════════════════════════════════════');
  }

  if (description) {
    lines.push(`Validating: ${description}`);
  }
  lines.push(`Duration: ${totalDuration}ms`);
  lines.push('');

  // Show steps if any
  if (steps.length > 0) {
    lines.push('Steps:');
    for (const step of steps) {
      const icon = step.success ? '✓' : '✗';
      let line = `  ${step.step}. ${icon} ${step.action}`;
      if (step.target) line += ` → ${step.target}`;
      line += ` (${step.duration}ms)`;
      lines.push(line);
      if (step.error) {
        lines.push(`      ⚠️ ${step.error}`);
      }
    }
    lines.push('');
  }

  // Show final errors
  if (finalErrors.length > 0) {
    lines.push('Final Assertion Failures:');
    for (const err of finalErrors) {
      lines.push(`  ⚠️ ${err}`);
    }
    lines.push('');
  }

  // Show final state summary
  if (finalState) {
    lines.push(`Final Screen: ${finalState.screen}`);
    if (finalState.user) {
      lines.push(`User: ${finalState.user.email ?? finalState.user.id ?? 'logged in'}`);
    }
    if (finalState.errors?.length > 0) {
      lines.push('');
      lines.push('App Errors:');
      for (const err of finalState.errors) {
        lines.push(`  • "${err}"`);
      }
      lines.push('');
      lines.push('[LLM INSTRUCTION: Evaluate error quality. If errors are vague, generic, or');
      lines.push(' poorly serialized (e.g., "[object Object]", just "500", "Error", "undefined"),');
      lines.push(' flag this and recommend the developer improve API error responses with');
      lines.push(' specific messages, error codes, and actionable details.]');
    }
  }

  // Actionable next steps
  if (!passed) {
    lines.push('');
    lines.push('─────────────────────────────────────────');
    lines.push('Next Steps:');
    if (finalErrors.some(e => e.includes('screen'))) {
      lines.push('  • Check navigation - are you on the right page?');
    }
    if (finalErrors.some(e => e.includes('element'))) {
      lines.push('  • Check element testIDs - use autonomo_get_state to see available elements');
    }
    if (finalState?.errors?.length > 0) {
      lines.push('  • Fix app errors before retrying validation');
    }
    lines.push('  • Review the failed step and fix the issue');
    lines.push('  • Re-run validation with autonomo_validate');
  }

  return lines.join('\n');
}

// ==========================================
// Help content fetcher
// ==========================================

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/sebringj/autonomo/main/docs/ai_help';

// Top-level topics
const TOP_LEVEL_TOPICS = ['index', 'overview', 'recommend', 'security', 'elements', 'custom-actions', 'multi-device', 'troubleshooting', 'scenarios', 'best-practices'] as const;

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
