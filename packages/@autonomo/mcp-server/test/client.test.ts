/**
 * Test harness for @autonomo/mcp-server
 * Run: npx tsx test/client.test.ts
 * 
 * Note: Requires a running Autonomo-enabled app, or use mock server below
 */

import http from 'http';
import { AutonomoClient } from '../src/client.js';

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

// Mock server for testing
function createMockServer(): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const mockState = {
      screen: 'test-screen',
      timestamp: Date.now(),
      elements: [
        { id: 'Test.Button', type: 'button' },
        { id: 'Test.Input', type: 'input', value: '' }
      ],
      customActions: ['testAction'],
      errors: [],
      logs: []
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
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const cmd = JSON.parse(body);
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            message: `Executed ${cmd.command}`,
            state: mockState
          }));
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
  console.log('\n🧪 @autonomo/mcp-server Test Harness\n');

  const { server, port } = await createMockServer();
  const client = new AutonomoClient(`http://localhost:${port}`);

  await test('client connects and gets state', async () => {
    const result = await client.getState();
    assert(result.success, 'Should succeed');
    assert(result.state.screen === 'test-screen', 'Screen should match');
    assert(result.state.elements.length === 2, 'Should have 2 elements');
  });

  await test('client can press element', async () => {
    const result = await client.press('Test.Button');
    assert(result.success, 'Should succeed');
    assert(result.message?.includes('press'), 'Message should mention press');
  });

  await test('client can fill input', async () => {
    const result = await client.fill('Test.Input', 'hello world');
    assert(result.success, 'Should succeed');
  });

  await test('client can navigate', async () => {
    const result = await client.navigate('other-screen');
    assert(result.success, 'Should succeed');
  });

  await test('client can execute custom action', async () => {
    const result = await client.custom('testAction', 'value');
    assert(result.success, 'Should succeed');
  });

  await test('client handles wait', async () => {
    const start = Date.now();
    const result = await client.wait(100);
    const elapsed = Date.now() - start;
    assert(result.success, 'Should succeed');
    assert(elapsed >= 100, 'Should wait at least 100ms');
  });

  server.close();

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
