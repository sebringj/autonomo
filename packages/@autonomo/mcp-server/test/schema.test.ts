/**
 * Schema descriptor tests
 */

import {
  AppStateSchema,
  ElementInfoSchema,
  CustomActionInfoSchema,
  schemaToMarkdown,
  generateElementSummary,
  generateCustomActionSummary,
  generateGetStateDescription,
  generateSendCommandDescription,
  toJsonSchema,
} from '../src/schema.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err}`);
    failed++;
  }
}

function assert(condition: boolean, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

console.log('\n🧪 Schema Descriptor Tests\n');

// ============================================================================
// Schema Structure Tests
// ============================================================================

test('AppStateSchema has required fields', () => {
  assert(AppStateSchema.name === 'AppState');
  assert(AppStateSchema.properties.screen.required === true);
  assert(AppStateSchema.properties.elements.required === true);
  assert(AppStateSchema.properties.customActions.required === true);
  assert(AppStateSchema.properties.errors.required === true);
});

test('ElementInfoSchema has required fields', () => {
  assert(ElementInfoSchema.name === 'ElementInfo');
  assert(ElementInfoSchema.properties.id.required === true);
  assert(ElementInfoSchema.properties.actions.required === true);
});

test('CustomActionInfoSchema has name as required', () => {
  assert(CustomActionInfoSchema.name === 'CustomActionInfo');
  assert(CustomActionInfoSchema.properties.name.required === true);
});

// ============================================================================
// Generator Function Tests
// ============================================================================

test('schemaToMarkdown generates readable output', () => {
  const md = schemaToMarkdown(ElementInfoSchema);
  assert(md.includes('interactive element'), 'Should include description content');
  assert(md.includes('id'), 'Should include id field');
  assert(md.includes('actions'), 'Should include actions field');
  assert(md.includes('Example'), 'Should include examples');
});

test('generateElementSummary returns element info', () => {
  const summary = generateElementSummary();
  assert(summary.includes('id:'), 'Should describe id');
  assert(summary.includes('type:'), 'Should describe type');
  assert(summary.includes('actions:'), 'Should describe actions');
  assert(summary.includes('disabled'), 'Should mention disabled');
  assert(summary.includes('hint'), 'Should mention hint');
});

test('generateCustomActionSummary returns action info', () => {
  const summary = generateCustomActionSummary();
  assert(summary.includes('name:'), 'Should describe name');
  assert(summary.includes('description:'), 'Should describe description');
  assert(summary.includes('args:'), 'Should describe args');
  assert(summary.includes('example:'), 'Should describe example');
});

test('generateGetStateDescription includes critical info', () => {
  const desc = generateGetStateDescription();
  assert(desc.includes('Element Registration'), 'Should mention registration');
  assert(desc.includes('autonomoRegister'), 'Should mention registration function');
  assert(desc.includes('testID'), 'Should warn about testID');
  assert(desc.includes('Custom Action'), 'Should mention custom actions');
});

test('generateSendCommandDescription includes all actions', () => {
  const desc = generateSendCommandDescription();
  assert(desc.includes('navigate:'), 'Should document navigate');
  assert(desc.includes('press:'), 'Should document press');
  assert(desc.includes('fillIn'), 'Should document fillIn');
  assert(desc.includes('submit:'), 'Should document submit');
  assert(desc.includes('custom:'), 'Should document custom');
  assert(desc.includes('CRITICAL'), 'Should have critical warning');
});

// ============================================================================
// JSON Schema Generation Tests
// ============================================================================

test('toJsonSchema generates valid JSON schema for ElementInfo', () => {
  const jsonSchema = toJsonSchema(ElementInfoSchema);
  assert(jsonSchema.type === 'object', 'Root should be object');
  assert(typeof jsonSchema.properties === 'object', 'Should have properties');
  const props = jsonSchema.properties as Record<string, unknown>;
  assert(props.id !== undefined, 'Should have id');
  assert(props.actions !== undefined, 'Should have actions');
  assert(Array.isArray(jsonSchema.required), 'Should have required array');
  assert((jsonSchema.required as string[]).includes('id'), 'id should be required');
});

test('toJsonSchema handles nested arrays correctly', () => {
  const jsonSchema = toJsonSchema(AppStateSchema);
  const props = jsonSchema.properties as Record<string, any>;
  assert(props.elements.type === 'array', 'elements should be array');
  assert(props.elements.items !== undefined, 'elements should have items');
  assert(props.customActions.type === 'array', 'customActions should be array');
});

test('toJsonSchema preserves descriptions and examples', () => {
  const jsonSchema = toJsonSchema(ElementInfoSchema);
  const props = jsonSchema.properties as Record<string, any>;
  assert(
    typeof props.id.description === 'string' && props.id.description.length > 0,
    'id should have description'
  );
  assert(Array.isArray(props.id.examples), 'id should have examples');
});

// ============================================================================
// Integration Test
// ============================================================================

test('Generated descriptions are used in multi-bridge (import works)', async () => {
  // This test verifies the import works by checking the generated descriptions
  // are not empty and contain expected content
  const getStateDesc = generateGetStateDescription();
  const sendCmdDesc = generateSendCommandDescription();
  
  assert(getStateDesc.length > 100, 'get_state description should be substantial');
  assert(sendCmdDesc.length > 100, 'send_command description should be substantial');
  
  // These should match what multi-bridge.ts now uses
  assert(getStateDesc.includes('Element Registration'), 'Should have element registration section');
  assert(sendCmdDesc.includes('Custom Actions'), 'Should have custom actions section');
});

// ============================================================================
// Results
// ============================================================================

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
