/**
 * Autonomo MCP Server - WebSocket Mode
 * 
 * Apps connect directly via WebSocket - no HTTP endpoints needed in apps.
 * 
 * Start: autonomo-mcp --ws
 * Apps connect to: ws://localhost:9876
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { getWSServer, type AutonomoWSServer, type AppState, type Command } from './ws-server.js';

export interface WSModeConfig {
  port?: number;
  name?: string;
  version?: string;
}

/**
 * Start MCP server with WebSocket bridge mode
 */
export async function startWSModeServer(config: WSModeConfig = {}): Promise<void> {
  const { port = 9876, name = 'autonomo', version = '0.1.0' } = config;
  
  // Start WebSocket server for apps to connect
  const wsServer = getWSServer(port);
  
  // Create MCP server
  const server = new Server(
    { name, version },
    { capabilities: { tools: {} } }
  );
  
  // Define MCP tools
  const tools: Tool[] = [
    {
      name: 'autonomo_list_bridges',
      description: 'List all connected applications. Returns each app\'s ID, name, platform, current screen, and element count.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'autonomo_get_state',
      description: 'Get the current state of an application. Returns screen name, elements, user info, errors, and custom actions.',
      inputSchema: {
        type: 'object',
        properties: {
          bridge: {
            type: 'string',
            description: 'Bridge ID to get state from. Use "all" to get state from all bridges.',
          },
        },
        required: ['bridge'],
      },
    },
    {
      name: 'autonomo_send_command',
      description: 'Send a command to an application. Built-in: navigate (screen), press (button), fillIn/fill (input), submit (enter key). Custom: use action="custom" with target=customActionName (see state.customActions).',
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
            description: 'Action type. For custom actions from state.customActions, use "custom".',
          },
          target: {
            type: 'string',
            description: 'For built-in actions: element ID or screen name. For action="custom": the custom action name (e.g., "fillOtp").',
          },
          value: {
            type: 'string',
            description: 'Value for fillIn or custom action argument.',
          },
        },
        required: ['bridge', 'action'],
      },
    },
    {
      name: 'autonomo_wait_for',
      description: 'Wait for a condition. Conditions: "screen:name", "element:id", "noError".',
      inputSchema: {
        type: 'object',
        properties: {
          bridge: {
            type: 'string',
            description: 'Bridge ID',
          },
          condition: {
            type: 'string',
            description: 'Condition to wait for. Format: "screen:home", "element:Button.ID", "noError"',
          },
          timeout: {
            type: 'number',
            description: 'Maximum wait time in milliseconds (default: 5000)',
          },
        },
        required: ['bridge', 'condition'],
      },
    },
    {
      name: 'autonomo_run_scenario',
      description: 'Execute a multi-step test scenario. Each step is an action like navigate, press, fillIn.',
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
                action: { type: 'string', enum: ['navigate', 'press', 'fillIn', 'fill', 'submit', 'custom', 'waitFor', 'wait'] },
                target: { type: 'string' },
                value: { type: 'string' },
                condition: { type: 'string' },
                timeout: { type: 'number' },
              },
              required: ['action'],
            },
          },
          stopOnError: {
            type: 'boolean',
            description: 'Stop on first error (default: true)',
          },
        },
        required: ['bridge', 'scenario'],
      },
    },
  ];
  
  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  
  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      switch (name) {
        case 'autonomo_list_bridges': {
          const bridges = wsServer.listBridges();
          
          if (bridges.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `No apps connected.\n\nApps should connect to: ws://localhost:${port}\n\nExample (React):\nimport { useAutonomo } from '@autonomo/react';\nuseAutonomo({ name: 'my-app' });`,
              }],
            };
          }
          
          let text = `Connected apps (${bridges.length}):\n\n`;
          for (const b of bridges) {
            text += `🟢 ${b.id}\n`;
            text += `   Name: ${b.name}\n`;
            text += `   Platform: ${b.platform}\n`;
            text += `   Screen: ${b.screen || '(unknown)'}\n`;
            text += `   Elements: ${b.elements ?? 0}\n\n`;
          }
          
          return { content: [{ type: 'text', text }] };
        }
        
        case 'autonomo_get_state': {
          const bridgeId = (args as any).bridge;
          
          if (bridgeId === 'all') {
            const bridges = wsServer.listBridges();
            if (bridges.length === 0) {
              return { content: [{ type: 'text', text: 'No apps connected.' }] };
            }
            
            let text = '';
            for (const b of bridges) {
              const state = wsServer.getState(b.id);
              text += `Bridge: ${b.id}\n`;
              text += `Screen: ${state?.screen || 'unknown'}\n`;
              if (state?.elements?.length) {
                text += `Elements:\n`;
                for (const el of state.elements) {
                  text += `  • ${el.id} (${el.type})${el.disabled ? ' [disabled]' : ''}\n`;
                }
              }
              if (state?.errors?.length) {
                text += `Errors: ${state.errors.join(', ')}\n`;
              }
              text += '---\n';
            }
            
            return { content: [{ type: 'text', text }] };
          }
          
          const state = wsServer.getState(bridgeId);
          if (!state) {
            return { content: [{ type: 'text', text: `Bridge not found or no state: ${bridgeId}` }] };
          }
          
          let text = `Screen: ${state.screen}\n\n`;
          if (state.elements?.length) {
            text += `Elements:\n`;
            for (const el of state.elements) {
              text += `  • ${el.id} (${el.type})${el.disabled ? ' [disabled]' : ''}`;
              if (el.value) text += ` = "${el.value}"`;
              if (el.hint) text += ` [hint: ${el.hint}]`;
              text += '\n';
            }
          }
          if (state.customActions?.length) {
            text += `\nCustom Actions (use action="custom", target=name):\n`;
            for (const ca of state.customActions) {
              if (typeof ca === 'string') {
                text += `  • ${ca}\n`;
              } else if (ca.name) {
                text += `  • ${ca.name}`;
                if (ca.description) text += ` - ${ca.description}`;
                if (ca.args) text += ` [args: ${JSON.stringify(ca.args)}]`;
                text += '\n';
              }
            }
          }
          if (state.errors?.length) {
            text += `\nErrors: ${state.errors.join(', ')}\n`;
          }
          
          return { content: [{ type: 'text', text }] };
        }
        
        case 'autonomo_send_command': {
          const { bridge: bridgeId, action, target, value } = args as any;
          
          try {
            const result = await wsServer.sendCommand(bridgeId, { action, target, value });
            
            let text = result.success ? '✓ Command succeeded' : '✗ Command failed';
            if (result.message) text += `: ${result.message}`;
            if (result.error) text += `\nError: ${result.error}`;
            text += `\n\nScreen: ${result.state.screen}`;
            if (result.state.elements?.length) {
              text += `\nElements: ${result.state.elements.map(e => e.id).join(', ')}`;
            }
            
            return { content: [{ type: 'text', text }] };
          } catch (err: any) {
            return { content: [{ type: 'text', text: `✗ Error: ${err.message}` }] };
          }
        }
        
        case 'autonomo_wait_for': {
          const { bridge: bridgeId, condition, timeout = 5000 } = args as any;
          const startTime = Date.now();
          const pollInterval = 100;
          
          const [type, value] = condition.split(':');
          
          while (Date.now() - startTime < timeout) {
            const state = wsServer.getState(bridgeId);
            if (!state) {
              await sleep(pollInterval);
              continue;
            }
            
            let matched = false;
            switch (type) {
              case 'screen':
                matched = state.screen === value || state.screen.includes(value);
                break;
              case 'element':
                matched = state.elements?.some(e => e.id === value) ?? false;
                break;
              case 'noError':
                matched = !state.errors?.length;
                break;
            }
            
            if (matched) {
              return { content: [{ type: 'text', text: `✓ Condition met: ${condition} (${Date.now() - startTime}ms)` }] };
            }
            
            await sleep(pollInterval);
          }
          
          return { content: [{ type: 'text', text: `✗ Timeout waiting for: ${condition}` }] };
        }
        
        case 'autonomo_run_scenario': {
          const { bridge: bridgeId, scenario, stopOnError = true } = args as any;
          const results: Array<{ step: number; action: string; success: boolean; duration: number; error?: string }> = [];
          const startTime = Date.now();
          
          for (let i = 0; i < scenario.length; i++) {
            const step = scenario[i];
            const stepStart = Date.now();
            
            try {
              if (step.action === 'wait') {
                // Simple sleep/delay
                const timeout = step.timeout || 1000;
                await sleep(timeout);
                
                results.push({
                  step: i + 1,
                  action: 'wait',
                  success: true,
                  duration: Date.now() - stepStart,
                });
              } else if (step.action === 'waitFor') {
                // Wait for condition
                const condition = step.condition || `element:${step.target}`;
                const timeout = step.timeout || 5000;
                const pollInterval = 100;
                const waitStart = Date.now();
                let matched = false;
                
                while (Date.now() - waitStart < timeout) {
                  const state = wsServer.getState(bridgeId);
                  if (state) {
                    const [type, value] = condition.split(':');
                    switch (type) {
                      case 'screen':
                        matched = state.screen === value || state.screen.includes(value);
                        break;
                      case 'element':
                        matched = state.elements?.some(e => e.id === value) ?? false;
                        break;
                      case 'noError':
                        matched = !state.errors?.length;
                        break;
                    }
                  }
                  if (matched) break;
                  await sleep(pollInterval);
                }
                
                results.push({
                  step: i + 1,
                  action: step.action,
                  success: matched,
                  duration: Date.now() - stepStart,
                  error: matched ? undefined : `Timeout: ${condition}`,
                });
                
                if (!matched && stopOnError) break;
              } else {
                // Send command
                const result = await wsServer.sendCommand(bridgeId, {
                  action: step.action,
                  target: step.target,
                  value: step.value,
                });
                
                results.push({
                  step: i + 1,
                  action: step.action,
                  success: result.success,
                  duration: Date.now() - stepStart,
                  error: result.error,
                });
                
                if (!result.success && stopOnError) break;
              }
            } catch (err: any) {
              results.push({
                step: i + 1,
                action: step.action,
                success: false,
                duration: Date.now() - stepStart,
                error: err.message,
              });
              if (stopOnError) break;
            }
          }
          
          const allSuccess = results.every(r => r.success);
          let text = allSuccess ? '✓ Scenario passed' : '✗ Scenario failed';
          text += ` (${Date.now() - startTime}ms)\n\n`;
          
          for (const r of results) {
            text += `${r.success ? '✓' : '✗'} Step ${r.step}: ${r.action} (${r.duration}ms)`;
            if (r.error) text += ` - ${r.error}`;
            text += '\n';
          }
          
          return { content: [{ type: 'text', text }] };
        }
        
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
      }
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
    }
  });
  
  // Start MCP server on stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Autonomo MCP server started (WebSocket mode)');
  console.error(`Apps connect to: ws://localhost:${port}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
