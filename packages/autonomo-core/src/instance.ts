/**
 * Instance - Unique identity for this app instance
 *
 * Each window/tab/simulator gets a unique instance ID that persists
 * for the lifetime of that instance. This allows the MCP server to
 * distinguish between multiple instances of the same app.
 */

export interface InstanceConfig {
  /** Application name (e.g., "my-react-app") */
  name: string;
  /** Platform type */
  platform: 'web' | 'mobile' | 'desktop';
  /** Custom instance ID (auto-generated if not provided) */
  instanceId?: string;
  /** Version string */
  version?: string;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

export interface InstanceInfo {
  /** Unique instance ID (auto-generated UUID) */
  instanceId: string;
  /** Application name */
  name: string;
  /** Full bridge ID: name + instanceId */
  bridgeId: string;
  /** Platform type */
  platform: 'web' | 'mobile' | 'desktop';
  /** Version string */
  version?: string;
  /** When this instance was created */
  createdAt: number;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

let currentInstance: InstanceInfo | undefined;

/**
 * Generate a short unique ID
 * Uses crypto.randomUUID if available, falls back to timestamp + random
 */
function generateInstanceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Use first 8 chars of UUID for brevity
    return crypto.randomUUID().substring(0, 8);
  }
  // Fallback: timestamp (base36) + random
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${timestamp.slice(-4)}${random}`;
}

/**
 * Initialize this app instance
 *
 * Call this once when your app mounts (e.g., in App.tsx useEffect).
 * The instance ID persists for the lifetime of this window/process.
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   initInstance({
 *     name: 'my-app',
 *     platform: 'web',
 *   });
 * }, []);
 * ```
 */
export function initInstance(config: InstanceConfig): InstanceInfo {
  const instanceId = config.instanceId ?? generateInstanceId();

  currentInstance = {
    instanceId,
    name: config.name,
    bridgeId: `${config.name}-${instanceId}`,
    platform: config.platform,
    version: config.version,
    createdAt: Date.now(),
    meta: config.meta,
  };

  return currentInstance;
}

/**
 * Get the current instance info
 *
 * Returns undefined if initInstance hasn't been called.
 */
export function getInstance(): InstanceInfo | undefined {
  return currentInstance;
}

/**
 * Get the current instance info or throw
 */
export function requireInstance(): InstanceInfo {
  if (!currentInstance) {
    throw new Error(
      'Autonomo instance not initialized. Call initInstance() first.'
    );
  }
  return currentInstance;
}

/**
 * Get just the bridge ID (name + instanceId)
 */
export function getBridgeId(): string | undefined {
  return currentInstance?.bridgeId;
}

/**
 * Reset the instance (mainly for testing)
 */
export function resetInstance(): void {
  currentInstance = undefined;
}
