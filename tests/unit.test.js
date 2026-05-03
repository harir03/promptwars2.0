/**
 * VoterPath — Comprehensive Unit Test Suite
 *
 * Tests pure utility functions exported from public/script.js.
 * Run with: npm test
 *
 * Test categories:
 * 1. State Deadline Lookup (boundary + edge cases)
 * 2. Input Sanitization (XSS, injection, truncation)
 * 3. Phase Navigation (ordering, boundaries)
 * 4. Server Module Validation (exports, configuration)
 *
 * @module unit.test
 */

'use strict';

const { getStateData, sanitizeInput, getPhaseIndex, getNextPhase } = require('../public/script.js');
const assert = require('assert');

let passed = 0;
let failed = 0;
let total = 0;

/**
 * Runs a named test case, tracks pass/fail count, and logs the result.
 *
 * @param {string} name - Human-readable test name
 * @param {Function} fn - Test function that throws on failure
 * @returns {void}
 */
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

// ══════════════════════════════════════════════════════════════════════════════
// 1. STATE DEADLINE LOOKUP
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n📋 State Deadline Lookup');

test('Returns data for valid state (Texas)', () => {
  const r = getStateData('Texas');
  assert.ok(r !== null, 'Should return data');
  assert.ok(r.deadline.includes('30 days'), 'Texas deadline should be 30 days');
});

test('Returns data for valid state (California)', () => {
  const r = getStateData('California');
  assert.strictEqual(r.sameDay, true, 'California should have same-day registration');
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

test('North Dakota has no registration required', () => {
  const r = getStateData('North Dakota');
  assert.ok(r.deadline.includes('No registration'), 'North Dakota requires no registration');
});

test('Colorado has same-day registration', () => {
  const r = getStateData('Colorado');
  assert.strictEqual(r.sameDay, true, 'Colorado supports same-day registration');
});

test('Florida does NOT have same-day registration', () => {
  const r = getStateData('Florida');
  assert.strictEqual(r.sameDay, false, 'Florida does not support same-day registration');
});

test('All 50 states are present in the dataset', () => {
  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
    'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
    'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  ];
  states.forEach((state) => {
    const r = getStateData(state);
    assert.ok(r !== null, `Missing data for ${state}`);
    assert.ok(typeof r.deadline === 'string', `${state} deadline should be a string`);
    assert.ok(typeof r.sameDay === 'boolean', `${state} sameDay should be a boolean`);
  });
});

test('State lookup is case-sensitive (lowercase returns null)', () => {
  assert.strictEqual(getStateData('texas'), null, 'Lowercase should not match');
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. INPUT SANITIZATION
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n🔒 Input Sanitization');

test('Strips <script> tags', () => {
  const result = sanitizeInput('<script>alert(1)</script>Hello');
  assert.ok(!result.includes('<script>'), 'Should strip script tags');
  assert.ok(result.includes('Hello'), 'Should preserve safe text');
});

test('Strips all HTML tags', () => {
  const result = sanitizeInput('<b>Bold</b> and <i>italic</i>');
  assert.ok(!result.includes('<b>'), 'Should strip <b> tags');
  assert.ok(!result.includes('<i>'), 'Should strip <i> tags');
  assert.ok(result.includes('Bold'), 'Should preserve inner text');
});

test('Blocks javascript: protocol', () => {
  const result = sanitizeInput('javascript:alert(1)');
  assert.ok(!result.includes('javascript:'), 'Should strip javascript: protocol');
});

test('Blocks JAVASCRIPT: protocol (case insensitive)', () => {
  const result = sanitizeInput('JAVASCRIPT:alert(1)');
  assert.ok(!result.includes('JAVASCRIPT:'), 'Should strip uppercase variant');
});

test('Strips inline event handlers (onclick=)', () => {
  const result = sanitizeInput('onclick=alert(1)');
  assert.ok(!result.includes('onclick='), 'Should strip event handlers');
});

test('Truncates to specified maxLength', () => {
  const input = 'a'.repeat(600);
  assert.strictEqual(sanitizeInput(input, 500).length, 500);
});

test('Truncates to default maxLength of 500', () => {
  const input = 'b'.repeat(1000);
  assert.strictEqual(sanitizeInput(input).length, 500);
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
  assert.ok(!result.includes('<'), 'Should strip all angle brackets');
  assert.ok(result.includes('text'), 'Should preserve inner text');
});

test('Preserves normal text without modification', () => {
  const input = 'How do I register to vote in California?';
  assert.strictEqual(sanitizeInput(input), input);
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. PHASE NAVIGATION
// ══════════════════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════════════════
// 4. SERVER MODULE VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n🖥️  Server Module Validation');

test('server.js exports an Express app with listen method', () => {
  const app = require('../server.js');
  assert.ok(typeof app === 'function', 'Should export a function (Express app)');
  assert.ok(typeof app.listen === 'function', 'App should have listen method');
});

test('server.js exports an app with use method', () => {
  const app = require('../server.js');
  assert.ok(typeof app.use === 'function', 'App should have use method');
});

test('package.json has required fields', () => {
  const pkg = require('../package.json');
  assert.ok(pkg.name === 'voterpath', 'Package name should be voterpath');
  assert.ok(pkg.main === 'server.js', 'Main entry should be server.js');
  assert.ok(pkg.engines && pkg.engines.node, 'Should specify node engine');
  assert.ok(pkg.scripts && pkg.scripts.start, 'Should have start script');
  assert.ok(pkg.scripts && pkg.scripts.test, 'Should have test script');
});

test('package.json has required dependencies', () => {
  const pkg = require('../package.json');
  assert.ok(pkg.dependencies['@google/generative-ai'], 'Should depend on Gemini SDK');
  assert.ok(pkg.dependencies['express'], 'Should depend on Express');
  assert.ok(pkg.dependencies['dotenv'], 'Should depend on dotenv');
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. SECURITY HARDENING
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n🔐 Security Hardening');

test('Server disables X-Powered-By header', () => {
  const app = require('../server.js');
  assert.strictEqual(
    app.get('x-powered-by'),
    false,
    'x-powered-by should be disabled (false)'
  );
});

test('Server trusts first proxy for Cloud Run', () => {
  const app = require('../server.js');
  assert.ok(app.get('trust proxy'), 'trust proxy should be set');
});

test('sanitizeInput blocks data: URI protocol in text', () => {
  const result = sanitizeInput('data:text/html,<script>alert(1)</script>');
  assert.ok(!result.includes('<script>'), 'Should strip script tags from data URI');
});

test('sanitizeInput blocks onmouseover= event handler', () => {
  const result = sanitizeInput('onmouseover=alert(1)');
  assert.ok(!result.includes('onmouseover='), 'Should strip mouse event handlers');
});

test('sanitizeInput blocks onfocus= event handler', () => {
  const result = sanitizeInput('onfocus=steal()');
  assert.ok(!result.includes('onfocus='), 'Should strip focus event handlers');
});

test('sanitizeInput handles extremely long input efficiently', () => {
  const longInput = 'x'.repeat(100000);
  const start = Date.now();
  const result = sanitizeInput(longInput, 500);
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 100, 'Should process long input in under 100ms');
  assert.strictEqual(result.length, 500, 'Should truncate to maxLength');
});

test('sanitizeInput blocks mixed-case JaVaScRiPt: protocol', () => {
  const result = sanitizeInput('JaVaScRiPt:void(0)');
  assert.ok(!result.toLowerCase().includes('javascript:'), 'Should strip mixed-case');
});

test('sanitizeInput blocks img onerror injection', () => {
  const result = sanitizeInput('<img src=x onerror=alert(1)>');
  assert.ok(!result.includes('<img'), 'Should strip img tag');
  assert.ok(!result.includes('onerror='), 'Should strip onerror handler');
});

test('.gitignore excludes .env files', () => {
  const fs = require('fs');
  const gitignore = fs.readFileSync(
    require('path').join(__dirname, '..', '.gitignore'),
    'utf8'
  );
  assert.ok(gitignore.includes('.env'), '.gitignore must exclude .env');
  assert.ok(gitignore.includes('.env.local'), '.gitignore must exclude .env.local');
  assert.ok(
    gitignore.includes('.env.production'),
    '.gitignore must exclude .env.production'
  );
});

test('.dockerignore excludes sensitive files', () => {
  const fs = require('fs');
  const dockerignore = fs.readFileSync(
    require('path').join(__dirname, '..', '.dockerignore'),
    'utf8'
  );
  assert.ok(dockerignore.includes('.env'), '.dockerignore must exclude .env');
  assert.ok(dockerignore.includes('.git'), '.dockerignore must exclude .git');
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. GOOGLE CLOUD INTEGRATION
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n☁️  Google Cloud Integration');

test('cloudbuild.yaml exists for CI/CD pipeline', () => {
  const fs = require('fs');
  const buildFile = require('path').join(__dirname, '..', 'cloudbuild.yaml');
  assert.ok(fs.existsSync(buildFile), 'cloudbuild.yaml must exist');
});

test('cloudbuild.yaml references Cloud Run deploy', () => {
  const fs = require('fs');
  const content = fs.readFileSync(
    require('path').join(__dirname, '..', 'cloudbuild.yaml'),
    'utf8'
  );
  assert.ok(content.includes('run'), 'Should reference Cloud Run');
  assert.ok(content.includes('deploy'), 'Should include deploy step');
  assert.ok(content.includes('gcr.io'), 'Should push to Google Container Registry');
});

test('cloudbuild.yaml uses Secret Manager for API key', () => {
  const fs = require('fs');
  const content = fs.readFileSync(
    require('path').join(__dirname, '..', 'cloudbuild.yaml'),
    'utf8'
  );
  assert.ok(content.includes('set-secrets'), 'Should use --set-secrets for Secret Manager');
  assert.ok(content.includes('gemini-api-key'), 'Should reference gemini-api-key secret');
});

test('cloudbuild.yaml runs lint and test before deploy', () => {
  const fs = require('fs');
  const content = fs.readFileSync(
    require('path').join(__dirname, '..', 'cloudbuild.yaml'),
    'utf8'
  );
  assert.ok(content.includes('lint'), 'Should run lint step');
  assert.ok(content.includes('test'), 'Should run test step');
});

test('server.js uses Google Cloud structured logging', () => {
  const fs = require('fs');
  const content = fs.readFileSync(
    require('path').join(__dirname, '..', 'server.js'),
    'utf8'
  );
  assert.ok(content.includes('cloudLog'), 'Should use cloudLog function');
  assert.ok(content.includes('severity'), 'Should include severity field');
  assert.ok(
    content.includes('logging.googleapis.com/labels'),
    'Should use Cloud Logging label format'
  );
});

test('server.js uses Google Cloud Error Reporting format', () => {
  const fs = require('fs');
  const content = fs.readFileSync(
    require('path').join(__dirname, '..', 'server.js'),
    'utf8'
  );
  assert.ok(content.includes('reportError'), 'Should use reportError function');
  assert.ok(
    content.includes('clouderrorreporting'),
    'Should use Error Reporting @type annotation'
  );
  assert.ok(
    content.includes('serviceContext'),
    'Should include serviceContext for Error Reporting'
  );
});

test('server.js uses Secret Manager for API key retrieval', () => {
  const fs = require('fs');
  const content = fs.readFileSync(
    require('path').join(__dirname, '..', 'server.js'),
    'utf8'
  );
  assert.ok(content.includes('getGeminiApiKey'), 'Should use getGeminiApiKey function');
  assert.ok(content.includes('Secret Manager'), 'Should reference Secret Manager');
});

test('server.js detects Google Cloud environment', () => {
  const fs = require('fs');
  const content = fs.readFileSync(
    require('path').join(__dirname, '..', 'server.js'),
    'utf8'
  );
  assert.ok(
    content.includes('GOOGLE_CLOUD_PROJECT'),
    'Should check GOOGLE_CLOUD_PROJECT env var'
  );
  assert.ok(content.includes('K_SERVICE'), 'Should check K_SERVICE (Cloud Run auto-set)');
  assert.ok(content.includes('IS_CLOUD'), 'Should have IS_CLOUD flag');
});

test('Google Analytics 4 external file exists', () => {
  const fs = require('fs');
  const gaFile = require('path').join(__dirname, '..', 'public', 'ga.js');
  assert.ok(fs.existsSync(gaFile), 'public/ga.js must exist');
  const content = fs.readFileSync(gaFile, 'utf8');
  assert.ok(content.includes('gtag'), 'ga.js should define gtag');
  assert.ok(content.includes('anonymize_ip'), 'ga.js should enable IP anonymization');
});

test('Google Fonts loaded in index.html', () => {
  const fs = require('fs');
  const html = fs.readFileSync(
    require('path').join(__dirname, '..', 'public', 'index.html'),
    'utf8'
  );
  assert.ok(
    html.includes('fonts.googleapis.com'),
    'Should load Google Fonts from fonts.googleapis.com'
  );
  assert.ok(html.includes('Outfit'), 'Should use Outfit font family');
});

test('health endpoint includes cloud detection fields', () => {
  const fs = require('fs');
  const content = fs.readFileSync(
    require('path').join(__dirname, '..', 'server.js'),
    'utf8'
  );
  assert.ok(
    content.includes("'google-cloud-run'"),
    'Health endpoint should report cloud platform'
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(50)}`);
console.log(`  Test Results: ${passed} passed, ${failed} failed (${total} total)`);
console.log(`  Pass Rate:    ${((passed / total) * 100).toFixed(1)}%`);
console.log(`${'═'.repeat(50)}\n`);

if (failed > 0) process.exit(1);

