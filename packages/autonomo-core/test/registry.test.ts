/**
 * Comprehensive Test Harness for autonomo-core
 * Run: npx tsx test/registry.test.ts
 */

import { 
  registry, 
  registerTapHandler, 
  registerFillHandler,
  registerToggleHandler,
  customActions,
  registerCustomAction,
  state,
  setNavigationHandler,
  navigate,
  press,
  fill,
  submit,
  custom,
  wait,
  getState,
  executeCommand,
} from '../src/index.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  const run = async () => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (e) {
      console.log(`❌ ${name}`);
      console.log(`   ${(e as Error).message}`);
      failed++;
    }
  };
  return run();
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function runTests() {
  console.log('\n🧪 autonomo-core Comprehensive Test Suite\n');
  console.log('═══════════════════════════════════════════\n');

  // ===================
  // REGISTRY TESTS
  // ===================
  console.log('📋 Registry Tests\n');

  registry.clear();

  await test('registry starts empty', () => {
    assert(registry.list().length === 0, 'Registry should be empty');
  });

  await test('registerTapHandler adds element', () => {
    let tapped = false;
    const unregister = registerTapHandler('Test.Button', () => { tapped = true; });
    
    assert(registry.has('Test.Button'), 'Element should exist');
    assert(registry.list().includes('Test.Button'), 'Element should be in list');
    
    const handler = registry.get('Test.Button');
    handler?.handler();
    assert(tapped, 'Handler should have been called');
    
    unregister();
    assert(!registry.has('Test.Button'), 'Element should be removed after unregister');
  });

  await test('registerFillHandler works with value', () => {
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

  await test('registerToggleHandler works', () => {
    let toggled = false;
    const unregister = registerToggleHandler(
      'Test.Toggle',
      () => { toggled = !toggled; },
      { getValue: () => toggled ? 'on' : 'off' }
    );
    
    assert(registry.has('Test.Toggle'), 'Toggle should exist');
    
    const handler = registry.get('Test.Toggle');
    handler?.handler();
    assert(toggled === true, 'Toggle should be on');
    assert(handler?.getValue?.() === 'on', 'getValue should return on');
    
    unregister();
  });

  await test('registry onChange fires on changes', () => {
    let changeCount = 0;
    const unsubscribe = registry.onChange(() => { changeCount++; });
    
    const unregister = registerTapHandler('Test.Change', () => {});
    assert(changeCount === 1, 'onChange should fire on register');
    
    unregister();
    assert(changeCount === 2, 'onChange should fire on unregister');
    
    unsubscribe();
  });

  await test('registry.find filters by pattern', () => {
    registerTapHandler('Login.Submit', () => {});
    registerTapHandler('Login.Cancel', () => {});
    registerTapHandler('Home.Button', () => {});
    
    const loginElements = registry.find(/^Login\./);
    assert(loginElements.length === 2, 'Should find 2 Login elements');
    
    registry.clear();
  });

  await test('disabled elements are tracked', () => {
    registerTapHandler('Disabled.Button', () => {}, { disabled: true });
    
    const info = registry.getAll().find(e => e.id === 'Disabled.Button');
    assert(info?.disabled === true, 'Element should be disabled');
    
    registry.clear();
  });

  await test('element hints are stored', () => {
    registerTapHandler('Hinted.Button', () => {}, { hint: 'Click to submit' });
    
    const info = registry.getAll().find(e => e.id === 'Hinted.Button');
    assert(info?.hint === 'Click to submit', 'Hint should be stored');
    
    registry.clear();
  });

  // ===================
  // CUSTOM ACTIONS TESTS
  // ===================
  console.log('\n📋 Custom Actions Tests\n');

  await test('customActions starts empty', () => {
    assert(customActions.list().length === 0, 'Custom actions should be empty');
  });

  await test('registerCustomAction adds action', async () => {
    const unregister = registerCustomAction('testAction', (value) => ({
      success: true,
      message: `Got: ${value}`,
    }));
    
    assert(customActions.has('testAction'), 'Action should exist');
    assert(customActions.list().includes('testAction'), 'Action should be in list');
    
    const result = await customActions.execute('testAction', 'hello');
    assert(result.success === true, 'Action should succeed');
    assert(result.message === 'Got: hello', 'Message should contain value');
    
    unregister();
    assert(!customActions.has('testAction'), 'Action should be removed');
  });

  await test('customActions handles async handlers', async () => {
    const unregister = registerCustomAction('asyncAction', async (value) => {
      await new Promise(r => setTimeout(r, 10));
      return { success: true, data: { received: value } };
    });
    
    const result = await customActions.execute('asyncAction', 'test');
    assert(result.success === true, 'Async action should succeed');
    assert((result.data as { received: string }).received === 'test', 'Data should be returned');
    
    unregister();
  });

  await test('customActions handles errors', async () => {
    const unregister = registerCustomAction('errorAction', () => {
      throw new Error('Intentional error');
    });
    
    const result = await customActions.execute('errorAction');
    assert(result.success === false, 'Should fail');
    assert(result.error?.includes('Intentional error'), 'Error message should be captured');
    
    unregister();
  });

  await test('customActions returns error for unknown action', async () => {
    const result = await customActions.execute('unknownAction');
    assert(result.success === false, 'Should fail');
    assert(result.error?.includes('Unknown'), 'Should mention unknown action');
  });

  // ===================
  // STATE TESTS
  // ===================
  console.log('\n📋 State Tests\n');

  await test('state tracks screen', () => {
    state.setScreen('login');
    assert(state.getScreen() === 'login', 'Screen should be login');
    
    const snapshot = state.getState();
    assert(snapshot.screen === 'login', 'State snapshot should have screen');
  });

  await test('state tracks user', () => {
    state.setUser({ id: 'u1', email: 'test@example.com', role: 'admin' });
    
    const snapshot = state.getState();
    assert(snapshot.user?.id === 'u1', 'User id should be set');
    assert(snapshot.user?.email === 'test@example.com', 'User email should be set');
    assert(snapshot.user?.role === 'admin', 'User role should be set');
  });

  await test('state tracks data', () => {
    state.setData({ cart: { items: 3 } });
    
    const snapshot = state.getState();
    assert((snapshot.data?.cart as { items: number }).items === 3, 'Cart items should be 3');
  });

  await test('state merges data', () => {
    state.setData({ a: 1 });
    state.mergeData({ b: 2 });
    
    const snapshot = state.getState();
    assert(snapshot.data?.a === 1, 'Data a should persist');
    assert(snapshot.data?.b === 2, 'Data b should be added');
  });

  await test('state tracks errors', () => {
    state.clearErrors();
    state.addError('Test error');
    
    const snapshot = state.getState();
    assert(snapshot.errors.includes('Test error'), 'Error should be tracked');
    
    state.clearErrors();
    assert(state.getState().errors.length === 0, 'Errors should be cleared');
  });

  await test('state tracks logs', () => {
    state.clearLogs();
    state.addLog('Test log');
    
    const snapshot = state.getState();
    assert(snapshot.logs.includes('Test log'), 'Log should be tracked');
    
    state.clearLogs();
  });

  await test('state onChange fires', () => {
    let changed = false;
    const unsubscribe = state.onChange(() => { changed = true; });
    
    state.setScreen('test');
    assert(changed === true, 'onChange should fire');
    
    unsubscribe();
  });

  await test('state includes elements and actions', () => {
    registry.clear();
    registerTapHandler('State.Button', () => {});
    registerCustomAction('stateAction', () => ({ success: true }));
    
    const snapshot = state.getState();
    assert(snapshot.elements.some(e => e.id === 'State.Button'), 'Elements should be in state');
    assert(snapshot.customActions.includes('stateAction'), 'Actions should be in state');
    
    registry.clear();
    customActions.unregister('stateAction');
  });

  // ===================
  // COMMANDS TESTS
  // ===================
  console.log('\n📋 Commands Tests\n');

  await test('press command works', async () => {
    let pressed = false;
    registerTapHandler('Cmd.Button', () => { pressed = true; });
    
    const result = await press('Cmd.Button');
    assert(result.success === true, 'Press should succeed');
    assert(pressed === true, 'Button should be pressed');
    
    registry.clear();
  });

  await test('press returns error for missing element', async () => {
    const result = await press('Missing.Button');
    assert(result.success === false, 'Should fail');
    assert(result.error?.includes('not found'), 'Error should mention not found');
  });

  await test('press returns error for disabled element', async () => {
    registerTapHandler('Disabled.Cmd', () => {}, { disabled: true });
    
    const result = await press('Disabled.Cmd');
    assert(result.success === false, 'Should fail');
    assert(result.error?.includes('disabled'), 'Error should mention disabled');
    
    registry.clear();
  });

  await test('fill command works', async () => {
    let value = '';
    registerFillHandler('Cmd.Input', (v) => { value = v; });
    
    const result = await fill('Cmd.Input', 'test value');
    assert(result.success === true, 'Fill should succeed');
    assert(value === 'test value', 'Value should be set');
    
    registry.clear();
  });

  await test('custom command works', async () => {
    registerCustomAction('cmdAction', (v) => ({
      success: true,
      message: `Ran with: ${v}`,
    }));
    
    const result = await custom('cmdAction', 'param');
    assert(result.success === true, 'Custom should succeed');
    
    customActions.unregister('cmdAction');
  });

  await test('navigate command with handler', async () => {
    let navigatedTo = '';
    setNavigationHandler((screen) => { navigatedTo = screen; });
    
    const result = await navigate('/home');
    assert(result.success === true, 'Navigate should succeed');
    assert(navigatedTo === '/home', 'Should navigate to /home');
  });

  await test('getState returns unified snapshot', async () => {
    registerTapHandler('Snapshot.Button', () => {});
    state.setScreen('snapshot-test');
    
    const result = await getState();
    assert(result.success === true, 'getState should succeed');
    assert(result.state.screen === 'snapshot-test', 'Screen should be in state');
    assert(result.state.elements.some(e => e.id === 'Snapshot.Button'), 'Element should be in state');
    
    registry.clear();
  });

  await test('executeCommand routes correctly', async () => {
    let pressed = false;
    registerTapHandler('Route.Button', () => { pressed = true; });
    
    const result = await executeCommand('press', 'Route.Button');
    assert(result.success === true, 'executeCommand should succeed');
    assert(pressed === true, 'Button should be pressed');
    
    registry.clear();
  });

  await test('wait command waits', async () => {
    const start = Date.now();
    const result = await wait(50);
    const elapsed = Date.now() - start;
    
    assert(result.success === true, 'Wait should succeed');
    assert(elapsed >= 45, 'Should have waited at least 45ms');
  });

  // ===================
  // SUMMARY
  // ===================
  console.log('\n═══════════════════════════════════════════');
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
