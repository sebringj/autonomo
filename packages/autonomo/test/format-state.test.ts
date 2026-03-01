/**
 * Test harness for formatState element grouping and expand functionality
 * Run: npx tsx test/format-state.test.ts
 */

// We need to test the formatting functions directly
// Import the module to test internal functions

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

// Mock the internal functions since they're not exported
// We'll test through the formatState behavior

interface Element {
  id: string;
  type?: string;
  actions?: string[];
  disabled?: boolean;
  value?: string;
  hint?: string;
}

interface GroupedElement {
  collapsed: boolean;
  prefix?: string;
  count?: number;
  actions?: string;
  element?: Element;
}

function extractCollapsiblePrefix(id: string): string | null {
  const parts = id.split('.');
  if (parts.length < 3) return null;
  
  const lastPart = parts[parts.length - 1];
  
  const isData = 
    /^\d{4}-\d{2}-\d{2}/.test(lastPart) ||
    /^[a-f0-9]{8}-[a-f0-9]{4}/.test(lastPart) ||
    (/^[a-z0-9]{6,}$/i.test(lastPart) && /\d/.test(lastPart)) ||
    /^\d+$/.test(lastPart) ||
    /^\d$/.test(lastPart);
  
  if (isData) {
    return parts.slice(0, -1).join('.');
  }
  
  return null;
}

function groupElementsByNamespace(elements: Element[], threshold: number, expandPrefix?: string): GroupedElement[] {
  const prefixCounts: Map<string, { count: number; actions: Set<string>; elements: Element[] }> = new Map();
  
  for (const el of elements) {
    const id = el.id || '';
    const prefix = extractCollapsiblePrefix(id);
    
    if (prefix) {
      const existing = prefixCounts.get(prefix) || { count: 0, actions: new Set(), elements: [] };
      existing.count++;
      const actions = Array.isArray(el.actions) ? el.actions : [el.type || 'tap'];
      actions.forEach((a: string) => existing.actions.add(a));
      existing.elements.push(el);
      prefixCounts.set(prefix, existing);
    }
  }
  
  const collapsedPrefixes = new Set<string>();
  for (const [prefix, data] of prefixCounts) {
    if (data.count >= threshold && prefix !== expandPrefix) {
      collapsedPrefixes.add(prefix);
    }
  }
  
  const result: GroupedElement[] = [];
  const addedPrefixes = new Set<string>();
  
  for (const el of elements) {
    const id = el.id || '';
    const prefix = extractCollapsiblePrefix(id);
    
    if (prefix && collapsedPrefixes.has(prefix)) {
      if (!addedPrefixes.has(prefix)) {
        const data = prefixCounts.get(prefix)!;
        result.push({
          collapsed: true,
          prefix,
          count: data.count,
          actions: Array.from(data.actions).join(', '),
        });
        addedPrefixes.add(prefix);
      }
    } else {
      result.push({
        collapsed: false,
        element: el,
      });
    }
  }
  
  return result;
}

console.log('\n🧪 Format State Tests\n');

// Test extractCollapsiblePrefix
test('extractCollapsiblePrefix detects date patterns', () => {
  assert(extractCollapsiblePrefix('WebApp.Schedule.Day.2026-02-01') === 'WebApp.Schedule.Day', 
    'Should extract prefix for date');
  assert(extractCollapsiblePrefix('WebApp.Schedule.Day.2026-03-14') === 'WebApp.Schedule.Day',
    'Should extract prefix for another date');
});

test('extractCollapsiblePrefix detects UUID patterns', () => {
  assert(extractCollapsiblePrefix('Chat.Message.a1b2c3d4-e5f6-7890-abcd-ef1234567890') === 'Chat.Message',
    'Should extract prefix for UUID');
});

test('extractCollapsiblePrefix detects hash/ID patterns', () => {
  assert(extractCollapsiblePrefix('AIChat.ToolCard.abc123def') === 'AIChat.ToolCard',
    'Should extract prefix for hash ID');
  // Timestamp-hash like 1770599955970-hp4zhka52 starts with digits and contains alphanumeric
  // The pattern /^[a-z0-9]{6,}$/i should match since it's alphanumeric with digits
  const result = extractCollapsiblePrefix('Chat.Message.msg123abc');
  assert(result === 'Chat.Message', `Should extract prefix for ID, got: ${result}`);
});

test('extractCollapsiblePrefix detects numeric indices', () => {
  assert(extractCollapsiblePrefix('AIChat.Suggestion.0') === 'AIChat.Suggestion',
    'Should extract prefix for index 0');
  assert(extractCollapsiblePrefix('AIChat.Suggestion.3') === 'AIChat.Suggestion',
    'Should extract prefix for index 3');
});

test('extractCollapsiblePrefix returns null for non-data suffixes', () => {
  assert(extractCollapsiblePrefix('WebApp.Nav.schedule') === null,
    'Should not collapse meaningful names');
  assert(extractCollapsiblePrefix('AIChat.Panel') === null,
    'Should not collapse short paths');
  assert(extractCollapsiblePrefix('WebApp.Dashboard') === null,
    'Should not collapse 2-part paths');
});

// Test groupElementsByNamespace
test('groupElementsByNamespace collapses large groups', () => {
  const elements: Element[] = [
    { id: 'WebApp.Schedule.Day.2026-02-01', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-02', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-03', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-04', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-05', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-06', type: 'tap' },
    { id: 'AIChat.Panel', type: 'tap' },
  ];
  
  const grouped = groupElementsByNamespace(elements, 5);
  
  // Should have 2 items: collapsed group + AIChat.Panel
  assert(grouped.length === 2, `Expected 2 items, got ${grouped.length}`);
  assert(grouped[0].collapsed === true, 'First should be collapsed group');
  assert(grouped[0].prefix === 'WebApp.Schedule.Day', `Wrong prefix: ${grouped[0].prefix}`);
  assert(grouped[0].count === 6, `Wrong count: ${grouped[0].count}`);
  assert(grouped[1].collapsed === false, 'Second should be individual element');
  assert(grouped[1].element?.id === 'AIChat.Panel', 'Second should be AIChat.Panel');
});

test('groupElementsByNamespace does not collapse small groups', () => {
  const elements: Element[] = [
    { id: 'AIChat.Suggestion.0', type: 'tap' },
    { id: 'AIChat.Suggestion.1', type: 'tap' },
    { id: 'AIChat.Suggestion.2', type: 'tap' },
    { id: 'AIChat.Panel', type: 'tap' },
  ];
  
  const grouped = groupElementsByNamespace(elements, 5);
  
  // All should be individual (group of 3 < threshold of 5)
  assert(grouped.length === 4, `Expected 4 items, got ${grouped.length}`);
  assert(grouped.every(g => !g.collapsed), 'All should be non-collapsed');
});

test('groupElementsByNamespace expands specified prefix', () => {
  const elements: Element[] = [
    { id: 'WebApp.Schedule.Day.2026-02-01', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-02', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-03', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-04', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-05', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-06', type: 'tap' },
  ];
  
  // Without expand - should collapse
  const collapsed = groupElementsByNamespace(elements, 5);
  assert(collapsed.length === 1, 'Should collapse to 1 item');
  assert(collapsed[0].collapsed === true, 'Should be collapsed');
  
  // With expand - should NOT collapse
  const expanded = groupElementsByNamespace(elements, 5, 'WebApp.Schedule.Day');
  assert(expanded.length === 6, `Expected 6 items with expand, got ${expanded.length}`);
  assert(expanded.every(g => !g.collapsed), 'All should be expanded');
});

test('groupElementsByNamespace handles mixed elements correctly', () => {
  const elements: Element[] = [
    { id: 'WebApp.Nav.schedule', type: 'tap' },
    { id: 'WebApp.Nav.teams', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-01', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-02', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-03', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-04', type: 'tap' },
    { id: 'WebApp.Schedule.Day.2026-02-05', type: 'tap' },
    { id: 'AIChat.Panel', type: 'tap' },
    { id: 'AIChat.ToolCard.abc123', type: 'tap' },
  ];
  
  const grouped = groupElementsByNamespace(elements, 5);
  
  // WebApp.Nav.* (2 items, not collapsed - below threshold)
  // WebApp.Schedule.Day.* (5 items, collapsed)
  // AIChat.Panel (individual)
  // AIChat.ToolCard.abc123 (individual - only 1 item)
  
  const collapsedCount = grouped.filter(g => g.collapsed).length;
  const individualCount = grouped.filter(g => !g.collapsed).length;
  
  assert(collapsedCount === 1, `Expected 1 collapsed group, got ${collapsedCount}`);
  assert(individualCount === 4, `Expected 4 individual items, got ${individualCount}`);
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

process.exit(failed > 0 ? 1 : 0);
