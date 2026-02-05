/**
 * Test harness for @autonomo/core
 * Run: npx tsx test/registry.test.ts
 */

import { registry, registerTapHandler, registerFillHandler } from '../src/index.js';

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

console.log('\n🧪 @autonomo/core Test Harness\n');

// Clean state
registry.clear();

test('registry starts empty', () => {
  assert(registry.list().length === 0, 'Registry should be empty');
});

test('registerTapHandler adds element', () => {
  let tapped = false;
  const unregister = registerTapHandler('Test.Button', () => { tapped = true; });
  
  assert(registry.has('Test.Button'), 'Element should exist');
  assert(registry.list().includes('Test.Button'), 'Element should be in list');
  
  // Invoke the handler
  const handler = registry.get('Test.Button');
  handler?.handler();
  assert(tapped, 'Handler should have been called');
  
  unregister();
  assert(!registry.has('Test.Button'), 'Element should be removed after unregister');
});

test('registerFillHandler works with value', () => {
  let value = '';
  const unregister = registerFillHandler(
    'Test.Input',
    (v) => { value = v; },
    { getValue: () => value }
  );
  
  assert(registry.has('Test.Input'), 'Input should exist');
  
  const handler = registry.get('Test.Input');
  handler?.handler('test value');
  assert(value === 'test value', 'Value should be set');
  assert(handler?.getValue?.() === 'test value', 'getValue should return value');
  
  unregister();
});

test('registry onChange fires on changes', () => {
  let changeCount = 0;
  const unsubscribe = registry.onChange(() => { changeCount++; });
  
  const unregister = registerTapHandler('Test.Change', () => {});
  assert(changeCount === 1, 'onChange should fire on register');
  
  unregister();
  assert(changeCount === 2, 'onChange should fire on unregister');
  
  unsubscribe();
});

test('registry.find filters by pattern', () => {
  registerTapHandler('Login.Submit', () => {});
  registerTapHandler('Login.Cancel', () => {});
  registerTapHandler('Home.Button', () => {});
  
  const loginElements = registry.find(/^Login\./);
  assert(loginElements.length === 2, 'Should find 2 Login elements');
  
  registry.clear();
});

test('disabled elements are tracked', () => {
  registerTapHandler('Disabled.Button', () => {}, { disabled: true });
  
  const info = registry.getAll().find(e => e.id === 'Disabled.Button');
  assert(info?.disabled === true, 'Element should be disabled');
  
  registry.clear();
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
