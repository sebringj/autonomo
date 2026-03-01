/**
 * Test harness for state diff functionality (diffOnly parameter)
 * Run: npx tsx test/diff-state.test.ts
 */

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

// ==========================================
// Replicate the diff logic from multi-bridge.ts
// ==========================================

interface StateSnapshot {
  screen: string;
  elements: Set<string>;
  errors: string[];
  customActions: string[];
  user?: string;
  raw: any;
}

function snapshotState(state: any): StateSnapshot {
  return {
    screen: state.screen || 'unknown',
    elements: new Set((state.elements || []).map((e: any) => e.id)),
    errors: state.errors || [],
    customActions: (state.customActions || []).map((a: any) => 
      typeof a === 'string' ? a : a.name
    ),
    user: state.user?.email || state.user?.id,
    raw: state,
  };
}

function computeDiff(
  prev: StateSnapshot | undefined, 
  curr: StateSnapshot
): { added: string[]; removed: string[]; screenChanged: boolean; errorsChanged: boolean; newErrors: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  
  for (const id of curr.elements) {
    if (!prev?.elements.has(id)) added.push(id);
  }
  if (prev) {
    for (const id of prev.elements) {
      if (!curr.elements.has(id)) removed.push(id);
    }
  }
  
  const screenChanged = prev?.screen !== curr.screen;
  const prevErrorSet = new Set(prev?.errors || []);
  const newErrors = curr.errors.filter(e => !prevErrorSet.has(e));
  const errorsChanged = newErrors.length > 0 || (prev?.errors.length || 0) !== curr.errors.length;
  
  return { added, removed, screenChanged, errorsChanged, newErrors };
}

function summarizeByPrefix(ids: string[]): string {
  const prefixCounts: Map<string, number> = new Map();
  for (const id of ids) {
    const parts = id.split('.');
    const prefix = parts.length > 1 ? parts.slice(0, -1).join('.') : id;
    prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
  }
  
  const summaries: string[] = [];
  for (const [prefix, count] of prefixCounts) {
    if (count > 1) {
      summaries.push(`${prefix}.* (${count})`);
    } else {
      const match = ids.find(id => id.startsWith(prefix));
      summaries.push(match || prefix);
    }
  }
  return summaries.slice(0, 5).join(', ') + (summaries.length > 5 ? '...' : '');
}

function formatStateDiff(curr: StateSnapshot, prev: StateSnapshot): string {
  const diff = computeDiff(prev, curr);
  const lines: string[] = [];

  lines.push(`Screen: ${curr.screen}${diff.screenChanged ? ` (was: ${prev.screen})` : ''}`);

  if (diff.errorsChanged) {
    if (diff.newErrors.length > 0) {
      lines.push('');
      lines.push('⚠️ NEW ERRORS:');
      for (const err of diff.newErrors) {
        lines.push(`  • "${err}"`);
      }
    }
    if (curr.errors.length === 0 && prev.errors.length > 0) {
      lines.push('');
      lines.push('✓ Errors cleared');
    }
  } else if (curr.errors.length > 0) {
    lines.push(`Errors: ${curr.errors.length} (unchanged)`);
  }

  if (diff.added.length > 0 || diff.removed.length > 0) {
    lines.push('');
    lines.push('Element Changes:');
    
    if (diff.added.length > 0) {
      if (diff.added.length <= 5) {
        lines.push(`  + Added: ${diff.added.join(', ')}`);
      } else {
        const prefixes = summarizeByPrefix(diff.added);
        lines.push(`  + Added (${diff.added.length}): ${prefixes}`);
      }
    }
    if (diff.removed.length > 0) {
      if (diff.removed.length <= 5) {
        lines.push(`  - Removed: ${diff.removed.join(', ')}`);
      } else {
        const prefixes = summarizeByPrefix(diff.removed);
        lines.push(`  - Removed (${diff.removed.length}): ${prefixes}`);
      }
    }
  } else {
    lines.push('');
    lines.push('Elements: unchanged');
  }

  lines.push('');
  lines.push(`Current: ${curr.elements.size} elements, ${curr.errors.length} errors`);

  return lines.join('\n');
}

// ==========================================
// Tests
// ==========================================

console.log('\n=== State Diff Tests ===\n');

test('snapshotState extracts element IDs into Set', () => {
  const state = {
    screen: 'Home',
    elements: [{ id: 'Button.A' }, { id: 'Button.B' }, { id: 'Input.Name' }],
    errors: [],
  };
  const snapshot = snapshotState(state);
  
  assert(snapshot.screen === 'Home', 'Screen should be Home');
  assert(snapshot.elements.size === 3, 'Should have 3 elements');
  assert(snapshot.elements.has('Button.A'), 'Should contain Button.A');
  assert(snapshot.elements.has('Input.Name'), 'Should contain Input.Name');
});

test('computeDiff detects added elements', () => {
  const prev = snapshotState({
    screen: 'Login',
    elements: [{ id: 'Login.Email' }, { id: 'Login.Password' }],
    errors: [],
  });
  const curr = snapshotState({
    screen: 'Login',
    elements: [{ id: 'Login.Email' }, { id: 'Login.Password' }, { id: 'Login.Submit' }],
    errors: [],
  });
  
  const diff = computeDiff(prev, curr);
  
  assert(diff.added.length === 1, 'Should have 1 added element');
  assert(diff.added[0] === 'Login.Submit', 'Added should be Login.Submit');
  assert(diff.removed.length === 0, 'Should have no removed elements');
  assert(!diff.screenChanged, 'Screen should not have changed');
});

test('computeDiff detects removed elements', () => {
  const prev = snapshotState({
    screen: 'Form',
    elements: [{ id: 'Form.A' }, { id: 'Form.B' }, { id: 'Form.C' }],
    errors: [],
  });
  const curr = snapshotState({
    screen: 'Form',
    elements: [{ id: 'Form.A' }],
    errors: [],
  });
  
  const diff = computeDiff(prev, curr);
  
  assert(diff.added.length === 0, 'Should have no added elements');
  assert(diff.removed.length === 2, 'Should have 2 removed elements');
  assert(diff.removed.includes('Form.B'), 'Should include Form.B');
  assert(diff.removed.includes('Form.C'), 'Should include Form.C');
});

test('computeDiff detects screen change', () => {
  const prev = snapshotState({ screen: 'Login', elements: [], errors: [] });
  const curr = snapshotState({ screen: 'Dashboard', elements: [], errors: [] });
  
  const diff = computeDiff(prev, curr);
  
  assert(diff.screenChanged, 'Screen should have changed');
});

test('computeDiff detects new errors', () => {
  const prev = snapshotState({ screen: 'Form', elements: [], errors: [] });
  const curr = snapshotState({ screen: 'Form', elements: [], errors: ['Invalid email'] });
  
  const diff = computeDiff(prev, curr);
  
  assert(diff.errorsChanged, 'Errors should have changed');
  assert(diff.newErrors.length === 1, 'Should have 1 new error');
  assert(diff.newErrors[0] === 'Invalid email', 'New error should be Invalid email');
});

test('computeDiff detects errors cleared', () => {
  const prev = snapshotState({ screen: 'Form', elements: [], errors: ['Old error'] });
  const curr = snapshotState({ screen: 'Form', elements: [], errors: [] });
  
  const diff = computeDiff(prev, curr);
  
  assert(diff.errorsChanged, 'Errors should have changed');
  assert(diff.newErrors.length === 0, 'Should have no new errors');
});

test('computeDiff handles no previous state', () => {
  const curr = snapshotState({
    screen: 'Home',
    elements: [{ id: 'A' }, { id: 'B' }],
    errors: [],
  });
  
  const diff = computeDiff(undefined, curr);
  
  assert(diff.added.length === 2, 'All elements should be added');
  assert(diff.removed.length === 0, 'Nothing removed');
  assert(diff.screenChanged, 'Screen is new');
});

test('formatStateDiff shows screen change', () => {
  const prev = snapshotState({ screen: 'Login', elements: [], errors: [] });
  const curr = snapshotState({ screen: 'Dashboard', elements: [], errors: [] });
  
  const output = formatStateDiff(curr, prev);
  
  assert(output.includes('Screen: Dashboard (was: Login)'), 'Should show screen change');
});

test('formatStateDiff shows element additions concisely', () => {
  const prev = snapshotState({ screen: 'Home', elements: [], errors: [] });
  const curr = snapshotState({
    screen: 'Home',
    elements: [{ id: 'Card.1' }, { id: 'Card.2' }],
    errors: [],
  });
  
  const output = formatStateDiff(curr, prev);
  
  assert(output.includes('+ Added: Card.1, Card.2'), 'Should list added elements');
  assert(output.includes('Current: 2 elements'), 'Should show element count');
});

test('formatStateDiff summarizes large additions by prefix', () => {
  const prev = snapshotState({ screen: 'Home', elements: [], errors: [] });
  const elements = [];
  for (let i = 0; i < 10; i++) {
    elements.push({ id: `List.Item.${i}` });
  }
  const curr = snapshotState({ screen: 'Home', elements, errors: [] });
  
  const output = formatStateDiff(curr, prev);
  
  assert(output.includes('+ Added (10):'), 'Should show count for large additions');
  assert(output.includes('List.Item.* (10)'), 'Should summarize by prefix');
});

test('formatStateDiff shows new errors prominently', () => {
  const prev = snapshotState({ screen: 'Form', elements: [], errors: [] });
  const curr = snapshotState({ screen: 'Form', elements: [], errors: ['Validation failed'] });
  
  const output = formatStateDiff(curr, prev);
  
  assert(output.includes('⚠️ NEW ERRORS:'), 'Should have error header');
  assert(output.includes('Validation failed'), 'Should show the error');
});

test('formatStateDiff shows errors cleared', () => {
  const prev = snapshotState({ screen: 'Form', elements: [], errors: ['Old error'] });
  const curr = snapshotState({ screen: 'Form', elements: [], errors: [] });
  
  const output = formatStateDiff(curr, prev);
  
  assert(output.includes('✓ Errors cleared'), 'Should indicate errors cleared');
});

test('formatStateDiff shows unchanged when nothing changes', () => {
  const prev = snapshotState({
    screen: 'Home',
    elements: [{ id: 'A' }],
    errors: [],
  });
  const curr = snapshotState({
    screen: 'Home',
    elements: [{ id: 'A' }],
    errors: [],
  });
  
  const output = formatStateDiff(curr, prev);
  
  assert(output.includes('Elements: unchanged'), 'Should indicate no changes');
  assert(!output.includes('was:'), 'Should not show screen change');
});

test('summarizeByPrefix groups elements correctly', () => {
  const ids = ['Form.Input.1', 'Form.Input.2', 'Form.Input.3', 'Header.Title'];
  const summary = summarizeByPrefix(ids);
  
  assert(summary.includes('Form.Input.* (3)'), 'Should group Form.Input');
  assert(summary.includes('Header.Title'), 'Should show single item');
});

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
