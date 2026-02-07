/**
 * Test harness for autonomo_help functionality
 * Run: npx tsx test/help.test.ts
 */

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

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/sebringj/autonomo/main/docs/ai_help';

// Top-level topics
const TOP_LEVEL_TOPICS = ['index', 'overview', 'security', 'elements', 'custom-actions', 'multi-device', 'troubleshooting', 'scenarios', 'best-practices'];

// Local development sub-topics
const LOCAL_DEV_TOPICS = [
  'local-development/index',
  'local-development/vscode-tasks',
  'local-development/auth-bypass',
  'local-development/payments',
  'local-development/email',
  'local-development/notifications',
  'local-development/databases',
  'local-development/realtime',
  'local-development/maps-location',
  'local-development/file-storage',
  'local-development/aws',
  'local-development/azure',
  'local-development/gcp',
  'local-development/ai-llm',
  'local-development/analytics',
  'local-development/checklist'
];

async function fetchTopic(topic: string): Promise<{ ok: boolean; status: number; content?: string; error?: string }> {
  const url = `${GITHUB_RAW_BASE}/${topic}.md`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'autonomo-mcp-server-test'
      }
    });
    
    if (!response.ok) {
      return { ok: false, status: response.status, error: `HTTP ${response.status}` };
    }
    
    const content = await response.text();
    return { ok: true, status: response.status, content };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function runTests() {
  console.log('🧪 Testing autonomo_help GitHub documentation fetch\n');
  console.log('=' .repeat(60));
  
  // Test top-level topics
  console.log('\n📚 Top-Level Topics:\n');
  
  for (const topic of TOP_LEVEL_TOPICS) {
    await test(`Fetch ${topic}.md`, async () => {
      const result = await fetchTopic(topic);
      assert(result.ok, `Failed to fetch ${topic}: ${result.error || result.status}`);
      assert(result.content!.length > 100, `Content too short for ${topic}: ${result.content!.length} bytes`);
      assert(result.content!.startsWith('#'), `Content should start with markdown header for ${topic}`);
    });
  }
  
  // Test local-development sub-topics
  console.log('\n📂 Local Development Sub-Topics:\n');
  
  for (const topic of LOCAL_DEV_TOPICS) {
    await test(`Fetch ${topic}.md`, async () => {
      const result = await fetchTopic(topic);
      assert(result.ok, `Failed to fetch ${topic}: ${result.error || result.status}`);
      assert(result.content!.length > 50, `Content too short for ${topic}: ${result.content!.length} bytes`);
      assert(result.content!.startsWith('#'), `Content should start with markdown header for ${topic}`);
    });
  }
  
  // Test content quality
  console.log('\n🔍 Content Quality Checks:\n');
  
  await test('Index has decision tree', async () => {
    const result = await fetchTopic('index');
    assert(result.ok, 'Failed to fetch index');
    assert(result.content!.includes('Decision Tree') || result.content!.includes('decision tree'), 
      'Index should contain decision tree');
  });
  
  await test('Local-development index has quick reference table', async () => {
    const result = await fetchTopic('local-development/index');
    assert(result.ok, 'Failed to fetch local-development index');
    assert(result.content!.includes('Quick Index') || result.content!.includes('If you need'), 
      'Local-dev index should have quick reference');
  });
  
  await test('Auth-bypass has multiple strategies', async () => {
    const result = await fetchTopic('local-development/auth-bypass');
    assert(result.ok, 'Failed to fetch auth-bypass');
    assert(result.content!.includes('Strategy 1') && result.content!.includes('Strategy 2'), 
      'Auth-bypass should have multiple strategies');
  });
  
  await test('AWS has LocalStack info', async () => {
    const result = await fetchTopic('local-development/aws');
    assert(result.ok, 'Failed to fetch aws');
    assert(result.content!.includes('LocalStack'), 'AWS should mention LocalStack');
  });
  
  await test('Azure has Azurite info', async () => {
    const result = await fetchTopic('local-development/azure');
    assert(result.ok, 'Failed to fetch azure');
    assert(result.content!.includes('Azurite'), 'Azure should mention Azurite');
  });
  
  await test('GCP has emulator info', async () => {
    const result = await fetchTopic('local-development/gcp');
    assert(result.ok, 'Failed to fetch gcp');
    assert(result.content!.includes('emulator') || result.content!.includes('Emulator'), 
      'GCP should mention emulators');
  });
  
  await test('Checklist has step-by-step guide', async () => {
    const result = await fetchTopic('local-development/checklist');
    assert(result.ok, 'Failed to fetch checklist');
    assert(result.content!.includes('Step 1') && result.content!.includes('Step 2'), 
      'Checklist should have step-by-step guide');
  });
  
  // Test 404 handling
  console.log('\n⚠️ Error Handling:\n');
  
  await test('Non-existent topic returns 404', async () => {
    const result = await fetchTopic('non-existent-topic');
    assert(!result.ok, 'Should fail for non-existent topic');
    assert(result.status === 404, `Expected 404, got ${result.status}`);
  });
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
