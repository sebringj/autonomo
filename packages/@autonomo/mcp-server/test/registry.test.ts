/**
 * Test harness for multi-bridge functionality
 * Run: npx tsx test/registry.test.ts
 */

import http from 'http';
import { BridgeRegistry, type BridgeConfig } from '../src/registry.js';

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

// Create mock server that includes instance info
function createMockServer(instanceId: string, name: string): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const mockState = {
      screen: 'test-screen',
      timestamp: Date.now(),
      instance: {
        instanceId,
        name,
        bridgeId: `${name}-${instanceId}`,
        platform: 'web' as const,
        createdAt: Date.now(),
      },
      elements: [
        { id: 'Test.Button', type: 'button' },
        { id: 'Test.Input', type: 'input', value: '' },
      ],
      customActions: ['testAction'],
      errors: [],
      logs: [],
      renderErrors: [],
    };

    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      if (req.url === '/state' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify(mockState));
        return;
      }

      if (req.url === '/command' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          const cmd = JSON.parse(body);
          res.writeHead(200);
          res.end(
            JSON.stringify({
              success: true,
              message: `Executed ${cmd.command}`,
              state: mockState,
            })
          );
        });
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.listen(0, () => {
      const addr = server.address() as { port: number };
      resolve({ server, port: addr.port });
    });
  });
}

async function runTests() {
  console.log('\n🧪 BridgeRegistry Test Harness\n');

  // Create two mock servers to simulate multiple apps
  const { server: server1, port: port1 } = await createMockServer('abc123', 'app-one');
  const { server: server2, port: port2 } = await createMockServer('def456', 'app-two');

  const registry = new BridgeRegistry();

  await test('registry starts empty', () => {
    assert(registry.size === 0, 'Should have 0 bridges');
    assert(registry.getBridgeIds().length === 0, 'Should return empty array');
  });

  await test('can register bridge by URL with auto-discovery', async () => {
    const bridgeId = await registry.registerByUrl(`http://localhost:${port1}`);
    assert(bridgeId === 'app-one-abc123', `Bridge ID should be app-one-abc123, got ${bridgeId}`);
    assert(registry.size === 1, 'Should have 1 bridge');
  });

  await test('can register second bridge', async () => {
    const bridgeId = await registry.registerByUrl(`http://localhost:${port2}`);
    assert(bridgeId === 'app-two-def456', `Bridge ID should be app-two-def456, got ${bridgeId}`);
    assert(registry.size === 2, 'Should have 2 bridges');
  });

  await test('listBridges returns both bridges with status', async () => {
    const bridges = await registry.listBridges();
    assert(bridges.length === 2, 'Should list 2 bridges');
    
    const bridge1 = bridges.find(b => b.id === 'app-one-abc123');
    assert(bridge1 !== undefined, 'Should find app-one');
    assert(bridge1?.status === 'connected', 'Should be connected');
    assert(bridge1?.screen === 'test-screen', 'Should have screen');
    assert(bridge1?.elements === 2, 'Should have 2 elements');
    assert(bridge1?.instance?.instanceId === 'abc123', 'Should have instance info');
  });

  await test('getState returns state for specific bridge', async () => {
    const result = await registry.getState('app-one-abc123');
    assert('state' in result, 'Should have state');
    assert((result as any).state.screen === 'test-screen', 'Screen should match');
    assert((result as any).state.instance?.bridgeId === 'app-one-abc123', 'Instance should match');
  });

  await test('getState("all") returns state for all bridges', async () => {
    const results = await registry.getState('all');
    assert(typeof results === 'object', 'Should return object');
    assert('app-one-abc123' in results, 'Should have app-one');
    assert('app-two-def456' in results, 'Should have app-two');
  });

  await test('sendCommand works', async () => {
    const result = await registry.sendCommand('app-one-abc123', 'press', 'Test.Button');
    assert(result.success, 'Should succeed');
    assert(result.duration !== undefined, 'Should have duration');
  });

  await test('waitFor works with screen condition', async () => {
    const result = await registry.waitFor('app-one-abc123', 'screen:test-screen', 1000);
    assert(result.success, 'Should succeed');
    assert(result.waited < 1000, 'Should not timeout');
  });

  await test('waitFor works with negated screen condition', async () => {
    // Screen is 'test-screen', so !screen:other-screen should succeed immediately
    const result = await registry.waitFor('app-one-abc123', '!screen:other-screen', 1000);
    assert(result.success, 'Should succeed when screen does NOT match');
    assert(result.waited < 100, 'Should succeed quickly');
  });

  await test('waitFor works with element condition', async () => {
    const result = await registry.waitFor('app-one-abc123', 'element:Test.Button', 1000);
    assert(result.success, 'Should succeed when element exists');
    assert(result.waited < 100, 'Should succeed quickly');
  });

  await test('waitFor works with negated element condition', async () => {
    // Test.Button exists, so !element:Test.Button should timeout
    const result = await registry.waitFor('app-one-abc123', '!element:Test.Button', 500);
    assert(!result.success, 'Should timeout because element exists');
  });

  await test('waitFor negated element succeeds when element missing', async () => {
    // NonExistent.Element does not exist, so !element should succeed
    const result = await registry.waitFor('app-one-abc123', '!element:NonExistent.Element', 1000);
    assert(result.success, 'Should succeed when element does NOT exist');
    assert(result.waited < 100, 'Should succeed quickly');
  });

  await test('runScenario executes steps', async () => {
    const result = await registry.runScenario('app-two-def456', [
      { action: 'press', target: 'Test.Button' },
      { action: 'fill', target: 'Test.Input', value: 'hello' },
    ]);
    assert(result.success, 'Should succeed');
    assert(result.steps.length === 2, 'Should have 2 steps');
    assert(result.steps[0].success, 'Step 1 should succeed');
    assert(result.steps[1].success, 'Step 2 should succeed');
  });

  await test('unregister removes bridge', () => {
    const removed = registry.unregister('app-one-abc123');
    assert(removed, 'Should return true');
    assert(registry.size === 1, 'Should have 1 bridge left');
    assert(!registry.hasBridge('app-one-abc123'), 'Should not have app-one');
  });

  await test('hasBridge and findByUrl work', () => {
    assert(registry.hasBridge('app-two-def456'), 'Should have app-two');
    assert(!registry.hasBridge('nonexistent'), 'Should not have nonexistent');
    
    const found = registry.findByUrl(`http://localhost:${port2}`);
    assert(found === 'app-two-def456', 'Should find by URL');
  });

  // Cleanup
  server1.close();
  server2.close();

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
