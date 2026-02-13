/**
 * Bridge Registry
 *
 * Manages multiple connected application bridges.
 * Supports both explicit configuration and auto-discovery.
 */

import { AutonomoClient, type AppState, type CommandResult, type InstanceInfo } from './client.js';

export interface BridgeConfig {
  /** Unique identifier for this bridge (can be auto-discovered from app) */
  id?: string;
  /** Human-readable name (can be auto-discovered from app) */
  name?: string;
  /** URL of the Autonomo endpoint */
  url: string;
  /** Platform type (can be auto-discovered from app) */
  platform?: 'web' | 'mobile' | 'desktop' | 'unknown';
}

export interface BridgeInfo {
  /** Unique identifier (from instance or config) */
  id: string;
  /** Human-readable name */
  name: string;
  /** URL of the Autonomo endpoint */
  url: string;
  /** Platform type */
  platform: 'web' | 'mobile' | 'desktop' | 'unknown';
  /** Current connection status */
  status: 'connected' | 'disconnected' | 'error';
  /** Current screen name */
  screen?: string;
  /** Number of available elements */
  elements?: number;
  /** Instance info from the app (if available) */
  instance?: InstanceInfo;
  /** Last error message if status is 'error' */
  error?: string;
  /** Last successful ping timestamp */
  lastSeen?: number;
}

export interface ScenarioStep {
  action: 'navigate' | 'press' | 'fillIn' | 'fill' | 'submit' | 'custom' | 'waitFor' | 'wait';
  target?: string;
  value?: string;
  condition?: string;
  timeout?: number;
}

export interface ScenarioResult {
  success: boolean;
  steps: Array<{
    step: number;
    action: string;
    success: boolean;
    duration: number;
    error?: string;
  }>;
  totalDuration: number;
  finalState?: AppState;
  error?: string;
}

export class BridgeRegistry {
  private bridges: Map<string, BridgeConfig & { id: string }> = new Map();
  private clients: Map<string, AutonomoClient> = new Map();
  /** Track discovered instance info by URL for re-identification */
  private instancesByUrl: Map<string, InstanceInfo> = new Map();

  constructor(initialBridges?: BridgeConfig[]) {
    if (initialBridges) {
      for (const bridge of initialBridges) {
        this.register(bridge);
      }
    }
  }

  /**
   * Register a new bridge
   *
   * If id/name/platform are not provided, they will be auto-discovered
   * from the app's instance info on first connection.
   */
  register(config: BridgeConfig): string {
    // Generate a temporary ID if not provided
    const id = config.id ?? `bridge-${Date.now().toString(36)}`;
    const fullConfig = {
      ...config,
      id,
      name: config.name ?? id,
      platform: config.platform ?? 'unknown' as const,
    };
    this.bridges.set(id, fullConfig);
    this.clients.set(id, new AutonomoClient(config.url));
    return id;
  }

  /**
   * Register by URL only - auto-discovers identity from the app
   */
  async registerByUrl(url: string): Promise<string> {
    const client = new AutonomoClient(url);

    // Try to get instance info from the app
    const result = await client.getState();
    const instance = result.state.instance;

    if (instance) {
      // Use the app's identity
      const id = instance.bridgeId;
      this.bridges.set(id, {
        id,
        name: instance.name,
        url,
        platform: instance.platform,
      });
      this.clients.set(id, client);
      this.instancesByUrl.set(url, instance);
      return id;
    } else {
      // Fallback to generic registration
      return this.register({ url });
    }
  }

  /**
   * Unregister a bridge
   */
  unregister(id: string): boolean {
    const config = this.bridges.get(id);
    if (config) {
      this.instancesByUrl.delete(config.url);
    }
    this.clients.delete(id);
    return this.bridges.delete(id);
  }

  /**
   * Get a client by bridge ID
   */
  getClient(id: string): AutonomoClient | undefined {
    return this.clients.get(id);
  }

  /**
   * Get bridge config by ID
   */
  getBridge(id: string): (BridgeConfig & { id: string }) | undefined {
    return this.bridges.get(id);
  }

  /**
   * Find a bridge by URL
   */
  findByUrl(url: string): string | undefined {
    for (const [id, config] of this.bridges) {
      if (config.url === url) {
        return id;
      }
    }
    return undefined;
  }

  /**
   * List all registered bridges with their current status
   */
  async listBridges(): Promise<BridgeInfo[]> {
    const results: BridgeInfo[] = [];

    for (const [id, config] of this.bridges) {
      const client = this.clients.get(id)!;
      const info: BridgeInfo = {
        id: config.id,
        name: config.name ?? config.id,
        url: config.url,
        platform: config.platform ?? 'unknown',
        status: 'disconnected',
      };

      try {
        const healthy = await client.health();
        if (healthy) {
          const result = await client.getState();
          const instance = result.state.instance;

          info.status = 'connected';
          info.screen = result.state.screen;
          info.elements = result.state.elements.length;
          info.lastSeen = Date.now();

          // Update with live instance info if available
          if (instance) {
            info.instance = instance;
            // Update our stored config if instance has changed
            if (instance.bridgeId !== id) {
              // Instance ID changed (app restarted) - update registry
              this.bridges.delete(id);
              this.clients.delete(id);
              this.bridges.set(instance.bridgeId, {
                id: instance.bridgeId,
                name: instance.name,
                url: config.url,
                platform: instance.platform,
              });
              this.clients.set(instance.bridgeId, client);
              info.id = instance.bridgeId;
              info.name = instance.name;
              info.platform = instance.platform;
            }
          }
        }
      } catch (error) {
        info.status = 'error';
        info.error = error instanceof Error ? error.message : String(error);
      }

      results.push(info);
    }

    return results;
  }

  /**
   * Get state from a specific bridge or all bridges
   */
  async getState(bridgeId: string | 'all'): Promise<CommandResult | Record<string, CommandResult>> {
    if (bridgeId === 'all') {
      const results: Record<string, CommandResult> = {};
      for (const [id, client] of this.clients) {
        try {
          results[id] = await client.getState();
        } catch (error) {
          results[id] = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            state: {
              screen: 'unknown',
              timestamp: Date.now(),
              elements: [],
              customActions: [],
              errors: [error instanceof Error ? error.message : String(error)],
              logs: [],
              renderErrors: [],
            },
          };
        }
      }
      return results;
    }

    const client = this.clients.get(bridgeId);
    if (!client) {
      throw new Error(`Bridge not found: ${bridgeId}`);
    }
    return client.getState();
  }

  /**
   * Send a command to a specific bridge
   */
  async sendCommand(
    bridgeId: string,
    action: 'navigate' | 'press' | 'fillIn' | 'fill' | 'submit' | 'custom',
    target: string,
    value?: string
  ): Promise<CommandResult & { previousScreen?: string; currentScreen?: string; duration?: number }> {
    const client = this.clients.get(bridgeId);
    if (!client) {
      throw new Error(`Bridge not found: ${bridgeId}`);
    }

    const startTime = Date.now();
    const beforeState = await client.getState();
    const previousScreen = beforeState.state.screen;

    let result: CommandResult;
    switch (action) {
      case 'navigate':
        result = await client.navigate(target);
        break;
      case 'press':
        result = await client.press(target);
        break;
      case 'fillIn':
      case 'fill':
        if (!value) throw new Error('value is required for fill action');
        result = await client.fill(target, value);
        break;
      case 'submit':
        result = await client.submit(target);
        break;
      case 'custom':
        result = await client.custom(target, value);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      ...result,
      previousScreen,
      currentScreen: result.state.screen,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Wait for a condition on a specific bridge
   */
  async waitFor(
    bridgeId: string,
    condition: string,
    timeout = 5000
  ): Promise<{ success: boolean; waited: number; state?: AppState; error?: string }> {
    const client = this.clients.get(bridgeId);
    if (!client) {
      throw new Error(`Bridge not found: ${bridgeId}`);
    }

    const startTime = Date.now();
    const pollInterval = 100;

    // Parse condition: "screen:home", "element:Dashboard.Stats", "data:isLoaded"
    // Support negation: "!element:X" means wait until element X is NOT present
    const isNegated = condition.startsWith('!');
    const normalizedCondition = isNegated ? condition.slice(1) : condition;
    const [type, value] = normalizedCondition.split(':');

    while (Date.now() - startTime < timeout) {
      const result = await client.getState();
      const state = result.state;

      let conditionMet = false;

      switch (type) {
        case 'screen':
          conditionMet = state.screen === value || state.screen.includes(value);
          break;
        case 'element':
          conditionMet = state.elements.some((el) => el.id === value);
          break;
        case 'data':
          conditionMet = state.data?.[value] !== undefined && state.data[value] !== false;
          break;
        case 'noError':
          conditionMet = state.errors.length === 0;
          break;
        default:
          // Generic condition - try to evaluate as property path
          conditionMet = Boolean(state.data?.[normalizedCondition]);
      }

      // Apply negation if specified
      if (isNegated) {
        conditionMet = !conditionMet;
      }

      if (conditionMet) {
        return {
          success: true,
          waited: Date.now() - startTime,
          state,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Timeout
    const finalResult = await client.getState();
    return {
      success: false,
      waited: Date.now() - startTime,
      state: finalResult.state,
      error: `Timeout waiting for condition: ${condition}`,
    };
  }

  /**
   * Run a multi-step scenario
   */
  async runScenario(
    bridgeId: string,
    scenario: ScenarioStep[],
    stopOnError = true
  ): Promise<ScenarioResult> {
    const client = this.clients.get(bridgeId);
    if (!client) {
      throw new Error(`Bridge not found: ${bridgeId}`);
    }

    const steps: ScenarioResult['steps'] = [];
    const overallStart = Date.now();
    let lastState: AppState | undefined;

    for (let i = 0; i < scenario.length; i++) {
      const step = scenario[i];
      const stepStart = Date.now();

      try {
        let result: CommandResult;

        switch (step.action) {
          case 'navigate':
            result = await client.navigate(step.target!);
            break;
          case 'press':
            result = await client.press(step.target!);
            break;
          case 'fillIn':
          case 'fill':
            result = await client.fill(step.target!, step.value!);
            break;
          case 'submit':
            result = await client.submit(step.target!);
            break;
          case 'custom':
            result = await client.custom(step.target!, step.value);
            break;
          case 'waitFor': {
            const waitResult = await this.waitFor(
              bridgeId,
              step.condition!,
              step.timeout ?? 5000
            );
            result = {
              success: waitResult.success,
              error: waitResult.error,
              state: waitResult.state ?? {
                screen: 'unknown',
                timestamp: Date.now(),
                elements: [],
                customActions: [],
                errors: [],
                logs: [],
                renderErrors: [],
              },
            };
            break;
          }
          case 'wait':
            result = await client.wait(step.timeout ?? 1000);
            break;
          default:
            throw new Error(`Unknown action: ${step.action}`);
        }

        lastState = result.state;
        const stepDuration = Date.now() - stepStart;

        if (result.success) {
          steps.push({
            step: i + 1,
            action: step.action,
            success: true,
            duration: stepDuration,
          });
        } else {
          steps.push({
            step: i + 1,
            action: step.action,
            success: false,
            duration: stepDuration,
            error: result.error,
          });

          if (stopOnError) {
            return {
              success: false,
              steps,
              totalDuration: Date.now() - overallStart,
              finalState: lastState,
              error: `Step ${i + 1} failed: ${result.error}`,
            };
          }
        }
      } catch (error) {
        const stepDuration = Date.now() - stepStart;
        const errorMsg = error instanceof Error ? error.message : String(error);

        steps.push({
          step: i + 1,
          action: step.action,
          success: false,
          duration: stepDuration,
          error: errorMsg,
        });

        if (stopOnError) {
          return {
            success: false,
            steps,
            totalDuration: Date.now() - overallStart,
            finalState: lastState,
            error: `Step ${i + 1} failed: ${errorMsg}`,
          };
        }
      }
    }

    return {
      success: steps.every((s) => s.success),
      steps,
      totalDuration: Date.now() - overallStart,
      finalState: lastState,
    };
  }

  /**
   * Get all bridge IDs
   */
  getBridgeIds(): string[] {
    return Array.from(this.bridges.keys());
  }

  /**
   * Check if a bridge exists
   */
  hasBridge(id: string): boolean {
    return this.bridges.has(id);
  }

  /**
   * Get the number of registered bridges
   */
  get size(): number {
    return this.bridges.size;
  }
}
