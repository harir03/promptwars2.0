'use strict';

const { getStateData, sanitizeInput, getPhaseIndex, getNextPhase } = require('../public/script.js');
const assert = require('assert');
const fs = require('fs');
const { join } = require('path');

const ROOT = join(__dirname, '..');

let passed = 0;
let failed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

console.log('\n📋 State Deadline Lookup');

test('Returns data for valid state (Maharashtra)', () => {
  const r = getStateData('Maharashtra');
  assert.ok(r !== null);
  assert.ok(r.registration.includes('NVSP'));
});

test('Returns data for valid state (Tamil Nadu)', () => {
  assert.strictEqual(getStateData('Tamil Nadu').onlineEnroll, true);
});

test('Returns null for unknown state', () => {
  assert.strictEqual(getStateData('Narnia'), null);
});

test('Returns null for empty string', () => {
  assert.strictEqual(getStateData(''), null);
});

test('Returns null for null input', () => {
  assert.strictEqual(getStateData(null), null);
});

test('Returns null for undefined input', () => {
  assert.strictEqual(getStateData(undefined), null);
});

test('Returns null for numeric input', () => {
  assert.strictEqual(getStateData(123), null);
});

test('Delhi has online enrollment', () => {
  assert.strictEqual(getStateData('Delhi').onlineEnroll, true);
});

test('Kerala has NVSP registration', () => {
  assert.ok(getStateData('Kerala').registration.includes('NVSP'));
});

test('Ladakh has online enrollment', () => {
  assert.strictEqual(getStateData('Ladakh').onlineEnroll, true);
});

test('All 36 states and UTs are present in the dataset', () => {
  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
  ];
  states.forEach((state) => {
    const r = getStateData(state);
    assert.ok(r !== null, `Missing data for ${state}`);
    assert.ok(typeof r.registration === 'string');
    assert.ok(typeof r.onlineEnroll === 'boolean');
  });
});

test('State lookup is case-sensitive (lowercase returns null)', () => {
  assert.strictEqual(getStateData('maharashtra'), null);
});

console.log('\n🔒 Input Sanitization');

test('Strips <script> tags', () => {
  const result = sanitizeInput('<script>alert(1)</script>Hello');
  assert.ok(!result.includes('<script>'));
  assert.ok(result.includes('Hello'));
});

test('Strips all HTML tags', () => {
  const result = sanitizeInput('<b>Bold</b> and <i>italic</i>');
  assert.ok(!result.includes('<b>'));
  assert.ok(!result.includes('<i>'));
  assert.ok(result.includes('Bold'));
});

test('Blocks javascript: protocol', () => {
  assert.ok(!sanitizeInput('javascript:alert(1)').includes('javascript:'));
});

test('Blocks JAVASCRIPT: protocol (case insensitive)', () => {
  assert.ok(!sanitizeInput('JAVASCRIPT:alert(1)').includes('JAVASCRIPT:'));
});

test('Strips inline event handlers (onclick=)', () => {
  assert.ok(!sanitizeInput('onclick=alert(1)').includes('onclick='));
});

test('Truncates to specified maxLength', () => {
  assert.strictEqual(sanitizeInput('a'.repeat(600), 500).length, 500);
});

test('Truncates to default maxLength of 500', () => {
  assert.strictEqual(sanitizeInput('b'.repeat(1000)).length, 500);
});

test('Returns empty string for null', () => {
  assert.strictEqual(sanitizeInput(null), '');
});

test('Returns empty string for undefined', () => {
  assert.strictEqual(sanitizeInput(undefined), '');
});

test('Returns empty string for empty string', () => {
  assert.strictEqual(sanitizeInput(''), '');
});

test('Returns empty string for non-string types', () => {
  assert.strictEqual(sanitizeInput(42), '');
  assert.strictEqual(sanitizeInput(true), '');
  assert.strictEqual(sanitizeInput({}), '');
});

test('Trims whitespace', () => {
  assert.strictEqual(sanitizeInput('  hello  '), 'hello');
});

test('Handles nested tags', () => {
  const result = sanitizeInput('<div><span>text</span></div>');
  assert.ok(!result.includes('<'));
  assert.ok(result.includes('text'));
});

test('Preserves normal text without modification', () => {
  const input = 'How do I register to vote in California?';
  assert.strictEqual(sanitizeInput(input), input);
});

console.log('\n🗺️  Phase Navigation');

test('getPhaseIndex — registration is 0', () => {
  assert.strictEqual(getPhaseIndex('registration'), 0);
});

test('getPhaseIndex — research is 1', () => {
  assert.strictEqual(getPhaseIndex('research'), 1);
});

test('getPhaseIndex — voting is 2', () => {
  assert.strictEqual(getPhaseIndex('voting'), 2);
});

test('getPhaseIndex — results is 3', () => {
  assert.strictEqual(getPhaseIndex('results'), 3);
});

test('getPhaseIndex — case-insensitive (VOTING returns 2)', () => {
  assert.strictEqual(getPhaseIndex('VOTING'), 2);
});

test('getPhaseIndex — unknown returns -1', () => {
  assert.strictEqual(getPhaseIndex('unknown'), -1);
});

test('getPhaseIndex — empty string returns -1', () => {
  assert.strictEqual(getPhaseIndex(''), -1);
});

test('getNextPhase — research follows registration', () => {
  assert.strictEqual(getNextPhase('registration'), 'research');
});

test('getNextPhase — voting follows research', () => {
  assert.strictEqual(getNextPhase('research'), 'voting');
});

test('getNextPhase — results follows voting', () => {
  assert.strictEqual(getNextPhase('voting'), 'results');
});

test('getNextPhase — null for last phase (results)', () => {
  assert.strictEqual(getNextPhase('results'), null);
});

test('getNextPhase — null for unknown phase', () => {
  assert.strictEqual(getNextPhase('xyz'), null);
});

console.log('\n🖥️  Server Module Validation');

test('server.js exports an Express app with listen method', () => {
  const app = require('../server.js');
  assert.ok(typeof app === 'function');
  assert.ok(typeof app.listen === 'function');
});

test('server.js exports an app with use method', () => {
  const app = require('../server.js');
  assert.ok(typeof app.use === 'function');
});

test('package.json has required fields', () => {
  const pkg = require('../package.json');
  assert.strictEqual(pkg.name, 'voterpath');
  assert.strictEqual(pkg.main, 'server.js');
  assert.ok(pkg.engines && pkg.engines.node);
  assert.ok(pkg.scripts && pkg.scripts.start);
  assert.ok(pkg.scripts && pkg.scripts.test);
});

test('package.json has required dependencies', () => {
  const pkg = require('../package.json');
  assert.ok(pkg.dependencies['@google/generative-ai']);
  assert.ok(pkg.dependencies['express']);
  assert.ok(pkg.dependencies['dotenv']);
});

console.log('\n🔐 Security Hardening');

test('Server disables X-Powered-By header', () => {
  const app = require('../server.js');
  assert.strictEqual(app.get('x-powered-by'), false);
});

test('Server trusts first proxy for Cloud Run', () => {
  const app = require('../server.js');
  assert.ok(app.get('trust proxy'));
});

test('sanitizeInput blocks data: URI protocol in text', () => {
  const result = sanitizeInput('data:text/html,<script>alert(1)</script>');
  assert.ok(!result.includes('<script>'));
});

test('sanitizeInput blocks onmouseover= event handler', () => {
  assert.ok(!sanitizeInput('onmouseover=alert(1)').includes('onmouseover='));
});

test('sanitizeInput blocks onfocus= event handler', () => {
  assert.ok(!sanitizeInput('onfocus=steal()').includes('onfocus='));
});

test('sanitizeInput handles extremely long input efficiently', () => {
  const start = Date.now();
  const result = sanitizeInput('x'.repeat(100000), 500);
  assert.ok(Date.now() - start < 100);
  assert.strictEqual(result.length, 500);
});

test('sanitizeInput blocks mixed-case JaVaScRiPt: protocol', () => {
  assert.ok(!sanitizeInput('JaVaScRiPt:void(0)').toLowerCase().includes('javascript:'));
});

test('sanitizeInput blocks img onerror injection', () => {
  const result = sanitizeInput('<img src=x onerror=alert(1)>');
  assert.ok(!result.includes('<img'));
  assert.ok(!result.includes('onerror='));
});

test('.gitignore excludes .env files', () => {
  const gitignore = fs.readFileSync(join(ROOT, '.gitignore'), 'utf8');
  assert.ok(gitignore.includes('.env'));
  assert.ok(gitignore.includes('.env.local'));
  assert.ok(gitignore.includes('.env.production'));
});

test('.dockerignore excludes sensitive files', () => {
  const dockerignore = fs.readFileSync(join(ROOT, '.dockerignore'), 'utf8');
  assert.ok(dockerignore.includes('.env'));
  assert.ok(dockerignore.includes('.git'));
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. GOOGLE CLOUD INTEGRATION
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n☁️  Google Cloud Integration');

const cloudbuild = fs.readFileSync(join(ROOT, 'cloudbuild.yaml'), 'utf8');
const serverSrc = fs.readFileSync(join(ROOT, 'server.js'), 'utf8');
const htmlSrc = fs.readFileSync(join(ROOT, 'public', 'index.html'), 'utf8');
const gaSrc = fs.readFileSync(join(ROOT, 'public', 'ga.js'), 'utf8');

test('cloudbuild.yaml exists and references Cloud Run deploy', () => {
  assert.ok(cloudbuild.includes('run'));
  assert.ok(cloudbuild.includes('deploy'));
  assert.ok(cloudbuild.includes('gcr.io'));
});

test('cloudbuild.yaml uses Secret Manager for API key', () => {
  assert.ok(cloudbuild.includes('set-secrets'));
  assert.ok(cloudbuild.includes('gemini-api-key'));
});

test('cloudbuild.yaml runs lint and test before deploy', () => {
  assert.ok(cloudbuild.includes('lint'));
  assert.ok(cloudbuild.includes('test'));
});

test('server.js uses Google Cloud structured logging', () => {
  assert.ok(serverSrc.includes('cloudLog'));
  assert.ok(serverSrc.includes('severity'));
  assert.ok(serverSrc.includes('logging.googleapis.com/labels'));
});

test('server.js uses Google Cloud Error Reporting format', () => {
  assert.ok(serverSrc.includes('reportError'));
  assert.ok(serverSrc.includes('clouderrorreporting'));
  assert.ok(serverSrc.includes('serviceContext'));
});

test('server.js uses Secret Manager for API key retrieval', () => {
  assert.ok(serverSrc.includes('getGeminiApiKey'));
  assert.ok(serverSrc.includes('Secret Manager'));
});

test('server.js detects Google Cloud environment', () => {
  assert.ok(serverSrc.includes('GOOGLE_CLOUD_PROJECT'));
  assert.ok(serverSrc.includes('K_SERVICE'));
  assert.ok(serverSrc.includes('IS_CLOUD'));
});

test('Google Analytics 4 file has valid config', () => {
  assert.ok(gaSrc.includes('gtag'));
  assert.ok(gaSrc.includes('anonymize_ip'));
  assert.ok(!gaSrc.includes('G-XXXXXXXXXX'));
  assert.ok(gaSrc.includes('G-'));
});

test('Google Fonts loaded in index.html', () => {
  assert.ok(htmlSrc.includes('fonts.googleapis.com'));
  assert.ok(htmlSrc.includes('Outfit'));
});

test('Health endpoint includes cloud detection fields', () => {
  assert.ok(serverSrc.includes("'google-cloud-run'"));
});

test('server.js includes request logging middleware', () => {
  assert.ok(serverSrc.includes('requestMethod'));
  assert.ok(serverSrc.includes('latency'));
});

test('.editorconfig exists for consistent formatting', () => {
  assert.ok(fs.existsSync(join(ROOT, '.editorconfig')));
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. ACCESSIBILITY COMPLIANCE
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n♿ Accessibility Compliance');

test('index.html has skip-to-content link (WCAG 2.4.1)', () => {
  assert.ok(htmlSrc.includes('skip-link'));
  assert.ok(htmlSrc.includes('#main-content'));
});

test('index.html has lang attribute on html element', () => {
  assert.ok(htmlSrc.includes('lang="en"'));
});

test('All form controls have aria-labels', () => {
  assert.ok(htmlSrc.includes('aria-label="Select your state'));
  assert.ok(htmlSrc.includes('aria-label="Type your election question"'));
  assert.ok(htmlSrc.includes('aria-label="Send message"'));
  assert.ok(htmlSrc.includes('aria-label="Close AI assistant"'));
});

test('Chat panel has correct ARIA dialog attributes', () => {
  assert.ok(htmlSrc.includes('role="dialog"'));
  assert.ok(htmlSrc.includes('aria-modal="true"'));
  assert.ok(htmlSrc.includes('aria-label="VoterPath AI Assistant"'));
});

test('Chat messages area has aria-live for screen readers', () => {
  assert.ok(htmlSrc.includes('aria-live="polite"'));
  assert.ok(htmlSrc.includes('aria-relevant="additions"'));
});

test('Progress bar has ARIA progressbar role', () => {
  assert.ok(htmlSrc.includes('role="progressbar"'));
  assert.ok(htmlSrc.includes('aria-valuenow'));
  assert.ok(htmlSrc.includes('aria-valuemin'));
  assert.ok(htmlSrc.includes('aria-valuemax'));
});

test('Tooltips use role=tooltip with aria-describedby', () => {
  assert.ok(htmlSrc.includes('role="tooltip"'));
  assert.ok(htmlSrc.includes('aria-describedby'));
});

test('Decorative elements have aria-hidden=true', () => {
  const ariaHiddenCount = (htmlSrc.match(/aria-hidden="true"/g) || []).length;
  assert.ok(ariaHiddenCount >= 10, `Expected >=10 aria-hidden elements, got ${ariaHiddenCount}`);
});

test('script.js respects prefers-reduced-motion', () => {
  const scriptContent = fs.readFileSync(join(ROOT, 'public', 'script.js'), 'utf8');
  assert.ok(scriptContent.includes('prefers-reduced-motion'));
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. CODE QUALITY VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n📝 Code Quality');

test('script.js has JSDoc file header', () => {
  const scriptContent = fs.readFileSync(join(ROOT, 'public', 'script.js'), 'utf8');
  assert.ok(scriptContent.includes('@file'), 'script.js should have @file JSDoc tag');
  assert.ok(scriptContent.includes('@version'), 'script.js should have @version');
});

test('server.js has JSDoc file header', () => {
  assert.ok(serverSrc.includes('@file'), 'server.js should have @file JSDoc tag');
  assert.ok(serverSrc.includes('@module'), 'server.js should have @module tag');
});

test('No console.log statements in production frontend code (except gtag)', () => {
  const scriptContent = fs.readFileSync(join(ROOT, 'public', 'script.js'), 'utf8');
  const consoleLines = scriptContent.split('\n').filter(
    (line) => line.includes('console.log') && !line.includes('//')
  );
  assert.strictEqual(consoleLines.length, 0, 'Frontend should not have console.log');
});

test('Render and Vercel deployment configs exist', () => {
  assert.ok(fs.existsSync(join(ROOT, 'render.yaml')));
  assert.ok(fs.existsSync(join(ROOT, 'vercel.json')));
});

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(50)}`);
console.log(`  Test Results: ${passed} passed, ${failed} failed (${total} total)`);
console.log(`  Pass Rate:    ${((passed / total) * 100).toFixed(1)}%`);
console.log(`${'═'.repeat(50)}\n`);

if (failed > 0) process.exit(1);

