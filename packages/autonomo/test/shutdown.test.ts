/**
 * Test harness for graceful shutdown
 * Run: npx tsx test/shutdown.test.ts
 */

import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void> | void) {
  return (async () => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (e) {
      console.log(`❌ ${name}`);
      console.log(`   ${(e as Error).message}`);
      failed++;
    }
  })();
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Spawn the CLI and wait for it to start listening
 */
function spawnCli(port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const cliPath = join(__dirname, '..', 'dist', 'cli.js');
    const child = spawn('node', [cliPath, '--port', String(port)], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        child.kill('SIGKILL');
        reject(new Error('Server did not start within timeout'));
      }
    }, 5000);

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('WebSocket server listening')) {
        started = true;
        clearTimeout(timeout);
        resolve(child);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Check if a process is still running
 */
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

console.log('🧪 Graceful Shutdown Tests\n');

// Use a unique port to avoid conflicts
const TEST_PORT = 19876;

await test('SIGTERM causes graceful shutdown', async () => {
  const child = await spawnCli(TEST_PORT);
  const pid = child.pid!;
  
  assert(isProcessRunning(pid), 'Server should be running');
  
  // Send SIGTERM
  child.kill('SIGTERM');
  
  // Wait for process to exit (should be quick with graceful shutdown)
  await sleep(500);
  
  assert(!isProcessRunning(pid), 'Server should have exited after SIGTERM');
});

await test('SIGINT causes graceful shutdown', async () => {
  const child = await spawnCli(TEST_PORT);
  const pid = child.pid!;
  
  assert(isProcessRunning(pid), 'Server should be running');
  
  // Send SIGINT (Ctrl+C)
  child.kill('SIGINT');
  
  // Wait for process to exit
  await sleep(500);
  
  assert(!isProcessRunning(pid), 'Server should have exited after SIGINT');
});

await test('Server logs shutdown message on SIGTERM', async () => {
  const child = await spawnCli(TEST_PORT);
  
  let shutdownLogged = false;
  
  child.stderr?.on('data', (data) => {
    if (data.toString().includes('shutting down gracefully')) {
      shutdownLogged = true;
    }
  });
  
  child.kill('SIGTERM');
  
  // Wait for output
  await sleep(500);
  
  assert(shutdownLogged, 'Server should log shutdown message');
});

await test('stdin close causes graceful shutdown (VS Code MCP stop)', async () => {
  const child = await spawnCli(TEST_PORT);
  const pid = child.pid!;
  
  assert(isProcessRunning(pid), 'Server should be running');
  
  // Close stdin (simulates VS Code MCP stopping the server)
  child.stdin?.end();
  
  // Wait for process to exit
  await sleep(500);
  
  assert(!isProcessRunning(pid), 'Server should have exited after stdin close');
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

process.exit(failed > 0 ? 1 : 0);
