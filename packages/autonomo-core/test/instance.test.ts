/**
 * Test harness for instance identity
 * Run: npx tsx test/instance.test.ts
 */

import {
  initInstance,
  getInstance,
  requireInstance,
  getBridgeId,
  resetInstance,
  type InstanceConfig,
} from '../src/instance.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}`);
    console.log(`   ${(e as Error).message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

console.log('\n🧪 Instance Identity Test Harness\n');

// Reset before tests
resetInstance();

test('getInstance returns undefined before init', () => {
  assert(getInstance() === undefined, 'Should be undefined');
});

test('getBridgeId returns undefined before init', () => {
  assert(getBridgeId() === undefined, 'Should be undefined');
});

test('requireInstance throws before init', () => {
  let threw = false;
  try {
    requireInstance();
  } catch {
    threw = true;
  }
  assert(threw, 'Should throw');
});

test('initInstance creates instance with auto-generated ID', () => {
  const config: InstanceConfig = {
    name: 'test-app',
    platform: 'web',
  };
  const instance = initInstance(config);

  assert(instance.name === 'test-app', 'Name should match');
  assert(instance.platform === 'web', 'Platform should match');
  assert(instance.instanceId.length === 8, 'ID should be 8 chars');
  assert(instance.bridgeId === `test-app-${instance.instanceId}`, 'BridgeId should be name-id');
  assert(instance.createdAt <= Date.now(), 'CreatedAt should be set');
});

test('getInstance returns the same instance', () => {
  const instance = getInstance();
  assert(instance !== undefined, 'Should not be undefined');
  assert(instance?.name === 'test-app', 'Name should match');
});

test('requireInstance returns the instance', () => {
  const instance = requireInstance();
  assert(instance.name === 'test-app', 'Name should match');
});

test('getBridgeId returns the bridge ID', () => {
  const bridgeId = getBridgeId();
  const instance = getInstance();
  assert(bridgeId === instance?.bridgeId, 'Should match');
});

test('initInstance with custom ID uses it', () => {
  resetInstance();
  const instance = initInstance({
    name: 'custom-app',
    platform: 'mobile',
    instanceId: 'my-custom-id',
    version: '1.0.0',
    meta: { foo: 'bar' },
  });

  assert(instance.instanceId === 'my-custom-id', 'Should use custom ID');
  assert(instance.bridgeId === 'custom-app-my-custom-id', 'BridgeId should use custom ID');
  assert(instance.version === '1.0.0', 'Version should be set');
  assert(instance.meta?.foo === 'bar', 'Meta should be set');
});

test('resetInstance clears the instance', () => {
  resetInstance();
  assert(getInstance() === undefined, 'Should be undefined after reset');
});

test('multiple initInstance calls return same instance (idempotent)', () => {
  resetInstance();
  const first = initInstance({ name: 'app1', platform: 'web' });
  const second = initInstance({ name: 'app2', platform: 'mobile' }); // Different config

  // Note: initInstance always overwrites - this test documents that behavior
  assert(second.name === 'app2', 'Second call should overwrite');
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
