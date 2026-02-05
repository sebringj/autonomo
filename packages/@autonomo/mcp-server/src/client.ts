/**
 * HTTP client for communicating with the Autonomo endpoint in the app
 */

export interface AppState {
  screen: string;
  timestamp: number;
  user?: {
    id?: string;
    email?: string;
    role?: string;
    [key: string]: unknown;
  };
  elements: Array<{
    id: string;
    type: string;
    disabled?: boolean;
    value?: string;
    hint?: string;
    meta?: Record<string, unknown>;
  }>;
  customActions: string[];
  data?: Record<string, unknown>;
  errors: string[];
  logs: string[];
  renderErrors: string[];
  network?: Array<{
    method: string;
    url: string;
    status?: number;
    duration?: number;
    error?: string;
  }>;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
  state: AppState;
}

export class AutonomoClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout = 30000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = timeout;
  }

  /**
   * Check if the app is reachable
   */
  async health(): Promise<boolean> {
    try {
      const response = await this.fetch('/health', 'GET');
      return response.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Get current app state
   */
  async getState(): Promise<CommandResult> {
    const state = await this.fetch('/state', 'GET');
    return { success: true, state };
  }

  /**
   * Navigate to a screen
   */
  async navigate(screen: string): Promise<CommandResult> {
    return this.command('navigate', screen);
  }

  /**
   * Press an element
   */
  async press(elementId: string): Promise<CommandResult> {
    return this.command('press', elementId);
  }

  /**
   * Fill text into an input
   */
  async fill(elementId: string, value: string): Promise<CommandResult> {
    return this.command('fill', elementId, value);
  }

  /**
   * Submit an input
   */
  async submit(elementId: string): Promise<CommandResult> {
    return this.command('submit', elementId);
  }

  /**
   * Execute a custom action
   */
  async custom(action: string, value?: string): Promise<CommandResult> {
    return this.command('custom', action, value);
  }

  /**
   * Wait for a duration
   */
  async wait(ms: number): Promise<CommandResult> {
    return this.command('wait', String(ms));
  }

  /**
   * Send a command
   */
  private async command(
    command: string,
    target?: string,
    value?: string
  ): Promise<CommandResult> {
    return this.fetch('/command', 'POST', { command, target, value });
  }

  /**
   * Make HTTP request
   */
  private async fetch(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok && !data.state) {
        throw new Error(data.error ?? `HTTP ${response.status}`);
      }

      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
