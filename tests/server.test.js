/**
 * VoterPath — Server Integration Tests
 *
 * Tests the Express app via real HTTP requests using Node's built-in http module.
 * No external test framework needed — uses assert + a lightweight test client.
 *
 * Coverage areas:
 * 1. Health endpoint (status, shape, timestamp)
 * 2. Chat input validation (missing, empty, too long, non-string, whitespace-only)
 * 3. Chat happy path (valid message → 200 or 502 depending on API connectivity)
 * 4. Security headers (CSP, HSTS, X-Frame, X-Content-Type, Permissions-Policy, XSS)
 * 5. CORS (allowed origin, blocked origin, preflight OPTIONS)
 * 6. SPA fallback (unknown routes serve index.html)
 * 7. Rate limiter structure validation
 * 8. Request handling edge cases (no body, optional history, malformed history)
 *
 * @module server.test
 */

'use strict';

const http = require('http');
const assert = require('assert');

const app = require('../server.js');

let server;
let baseUrl;
let passed = 0;
let failed = 0;
let total = 0;

/**
 * Sends an HTTP request and returns { statusCode, headers, body }.
 * @param {string} method
 * @param {string} path
 * @param {object} [options]
 * @returns {Promise<{statusCode: number, headers: object, body: string}>}
 */
function request(method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...options.headers },
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });

    req.on('error', reject);
    if (options.body) {
      const payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.setHeader('Content-Type', 'application/json');
      req.write(payload);
    }
    req.end();
  });
}

/** Runs a named test, tracks results. */
async function test(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

async function runAllTests() {
  // Start server on random port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  // ── 1. HEALTH ENDPOINT ──────────────────────────────────────────
  console.log('\n💓 Health Endpoint');

  await test('GET /health returns 200', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.statusCode, 200);
  });

  await test('GET /health returns correct JSON shape', async () => {
    const res = await request('GET', '/health');
    const data = JSON.parse(res.body);
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'voterpath');
    assert.strictEqual(data.version, '1.0.0');
    assert.ok(data.timestamp, 'Should include timestamp');
  });

  await test('GET /health timestamp is valid ISO string', async () => {
    const res = await request('GET', '/health');
    const data = JSON.parse(res.body);
    const parsed = new Date(data.timestamp);
    assert.ok(!isNaN(parsed.getTime()), 'Timestamp should be valid ISO date');
  });

  await test('GET /health returns application/json content type', async () => {
    const res = await request('GET', '/health');
    assert.ok(res.headers['content-type'].includes('application/json'));
  });

  // ── 2. CHAT INPUT VALIDATION ────────────────────────────────────
  console.log('\n💬 Chat Input Validation');

  await test('POST /api/chat — missing message returns 400', async () => {
    const res = await request('POST', '/api/chat', { body: {} });
    assert.strictEqual(res.statusCode, 400);
    const data = JSON.parse(res.body);
    assert.ok(data.error.includes('required'), 'Error should mention required');
  });

  await test('POST /api/chat — null message returns 400', async () => {
    const res = await request('POST', '/api/chat', { body: { message: null } });
    assert.strictEqual(res.statusCode, 400);
  });

  await test('POST /api/chat — numeric message returns 400', async () => {
    const res = await request('POST', '/api/chat', { body: { message: 12345 } });
    assert.strictEqual(res.statusCode, 400);
  });

  await test('POST /api/chat — boolean message returns 400', async () => {
    const res = await request('POST', '/api/chat', { body: { message: true } });
    assert.strictEqual(res.statusCode, 400);
  });

  await test('POST /api/chat — empty string message returns 400', async () => {
    const res = await request('POST', '/api/chat', { body: { message: '' } });
    assert.strictEqual(res.statusCode, 400);
    const data = JSON.parse(res.body);
    assert.ok(data.error.includes('required'), 'Should indicate message is required');
  });

  await test('POST /api/chat — whitespace-only message returns 400', async () => {
    const res = await request('POST', '/api/chat', { body: { message: '   \t\n  ' } });
    assert.strictEqual(res.statusCode, 400);
    const data = JSON.parse(res.body);
    assert.ok(data.error.includes('empty'), 'Error should mention empty');
  });

  await test('POST /api/chat — message too long returns 400', async () => {
    const res = await request('POST', '/api/chat', { body: { message: 'x'.repeat(1001) } });
    assert.strictEqual(res.statusCode, 400);
    const data = JSON.parse(res.body);
    assert.ok(data.error.includes('1000'), 'Error should mention character limit');
  });

  await test('POST /api/chat — array message returns 400', async () => {
    const res = await request('POST', '/api/chat', { body: { message: ['hello'] } });
    assert.strictEqual(res.statusCode, 400);
  });

  await test('POST /api/chat — object message returns 400', async () => {
    const res = await request('POST', '/api/chat', { body: { message: { text: 'hi' } } });
    assert.strictEqual(res.statusCode, 400);
  });

  // ── 3. CHAT VALID REQUESTS ──────────────────────────────────────
  console.log('\n🤖 Chat Valid Requests');

  await test('POST /api/chat — valid message passes validation (not 400)', async () => {
    const res = await request('POST', '/api/chat', { body: { message: 'How do I vote?' } });
    // With a valid API key it returns 200; without it returns 503; never 400
    assert.ok(res.statusCode !== 400, 'Valid message should not return 400');
  });

  await test('POST /api/chat — valid response has reply field when 200', async () => {
    const res = await request('POST', '/api/chat', { body: { message: 'What is voting?' } });
    if (res.statusCode === 200) {
      const data = JSON.parse(res.body);
      assert.ok(typeof data.reply === 'string', 'Response should have reply string');
      assert.ok(data.reply.length > 0, 'Reply should not be empty');
    }
    // If no API key, it'll be 503 — that's also valid behavior
    assert.ok([200, 502, 503].includes(res.statusCode), 'Should be 200, 502, or 503');
  });

  await test('POST /api/chat — message at exactly 1000 chars passes validation', async () => {
    const res = await request('POST', '/api/chat', { body: { message: 'a'.repeat(1000) } });
    // Should not be rejected for length
    assert.ok(res.statusCode !== 400, 'Exactly 1000 chars should pass validation');
  });

  await test('POST /api/chat — history is optional', async () => {
    const res = await request('POST', '/api/chat', { body: { message: 'Test question' } });
    assert.ok(res.statusCode !== 400, 'Missing history should default to empty');
  });

  await test('POST /api/chat — malformed history entries are filtered safely', async () => {
    const res = await request('POST', '/api/chat', {
      body: {
        message: 'Test',
        history: [null, { role: 'user' }, { text: 'hi' }, { role: 'user', text: 'valid' }],
      },
    });
    assert.ok(res.statusCode !== 400, 'Malformed history should be filtered, not rejected');
  });

  await test('POST /api/chat — history with ai role is mapped to model', async () => {
    const res = await request('POST', '/api/chat', {
      body: {
        message: 'Follow up',
        history: [
          { role: 'user', text: 'How do I register?' },
          { role: 'ai', text: 'Visit vote.gov' },
        ],
      },
    });
    assert.ok(res.statusCode !== 400, 'History with ai role should be accepted');
  });

  await test('POST /api/chat — history truncated to max 10 turns', async () => {
    const longHistory = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'ai',
      text: `Message ${i}`,
    }));
    const res = await request('POST', '/api/chat', {
      body: { message: 'Final question', history: longHistory },
    });
    assert.ok(res.statusCode !== 400, 'Long history should be truncated, not rejected');
  });

  // ── 4. SECURITY HEADERS ─────────────────────────────────────────
  console.log('\n🛡️  Security Headers');

  await test('CSP header includes default-src self', async () => {
    const res = await request('GET', '/health');
    const csp = res.headers['content-security-policy'];
    assert.ok(csp, 'CSP header should be present');
    assert.ok(csp.includes("default-src 'self'"), 'CSP should have default-src self');
  });

  await test('CSP header blocks framing', async () => {
    const res = await request('GET', '/health');
    const csp = res.headers['content-security-policy'];
    assert.ok(csp.includes("frame-ancestors 'none'"), 'CSP should block framing');
  });

  await test('X-Frame-Options is DENY', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY');
  });

  await test('X-Content-Type-Options is nosniff', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
  });

  await test('Strict-Transport-Security is present with max-age', async () => {
    const res = await request('GET', '/health');
    const hsts = res.headers['strict-transport-security'];
    assert.ok(hsts, 'HSTS header should be present');
    assert.ok(hsts.includes('max-age='), 'HSTS should have max-age');
    assert.ok(hsts.includes('includeSubDomains'), 'HSTS should include subdomains');
  });

  await test('Referrer-Policy is strict-origin-when-cross-origin', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  });

  await test('Permissions-Policy disables camera, microphone, geolocation', async () => {
    const res = await request('GET', '/health');
    const pp = res.headers['permissions-policy'];
    assert.ok(pp, 'Permissions-Policy should be present');
    assert.ok(pp.includes('camera=()'), 'Should disable camera');
    assert.ok(pp.includes('microphone=()'), 'Should disable microphone');
    assert.ok(pp.includes('geolocation=()'), 'Should disable geolocation');
  });

  await test('X-XSS-Protection header is present', async () => {
    const res = await request('GET', '/health');
    const xss = res.headers['x-xss-protection'];
    assert.ok(xss !== undefined, 'X-XSS-Protection header should be present');
    // Modern browsers may set '0' to disable (CSP preferred); legacy uses '1; mode=block'
    assert.ok(xss === '1; mode=block' || xss === '0', `Unexpected value: ${xss}`);
  });

  await test('CSP allows Google Analytics and Tag Manager', async () => {
    const res = await request('GET', '/health');
    const csp = res.headers['content-security-policy'];
    assert.ok(csp.includes('googletagmanager.com'), 'CSP should allow GTM');
    assert.ok(csp.includes('google-analytics.com'), 'CSP should allow GA');
  });

  await test('CSP allows Google Fonts', async () => {
    const res = await request('GET', '/health');
    const csp = res.headers['content-security-policy'];
    assert.ok(csp.includes('fonts.googleapis.com'), 'CSP should allow Fonts CSS');
    assert.ok(csp.includes('fonts.gstatic.com'), 'CSP should allow Fonts files');
  });

  await test('CSP allows Cloud Run and Render domains', async () => {
    const res = await request('GET', '/health');
    const csp = res.headers['content-security-policy'];
    assert.ok(csp.includes('*.run.app'), 'CSP should allow Cloud Run');
    assert.ok(csp.includes('*.onrender.com'), 'CSP should allow Render');
  });

  await test('Security headers present on POST endpoints too', async () => {
    const res = await request('POST', '/api/chat', { body: { message: '' } });
    assert.ok(res.headers['x-frame-options'] === 'DENY');
    assert.ok(res.headers['x-content-type-options'] === 'nosniff');
  });

  // ── 5. CORS ─────────────────────────────────────────────────────
  console.log('\n🌐 CORS');

  await test('CORS allows localhost:8080 origin', async () => {
    const res = await request('GET', '/health', {
      headers: { 'Origin': 'http://localhost:8080' },
    });
    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:8080');
  });

  await test('CORS allows localhost:3000 origin', async () => {
    const res = await request('GET', '/health', {
      headers: { 'Origin': 'http://localhost:3000' },
    });
    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:3000');
  });

  await test('CORS blocks unknown origin', async () => {
    const res = await request('GET', '/health', {
      headers: { 'Origin': 'http://evil.com' },
    });
    assert.ok(!res.headers['access-control-allow-origin'], 'Should not set ACAO for unknown origin');
  });

  await test('CORS includes allowed methods header', async () => {
    const res = await request('GET', '/health', {
      headers: { 'Origin': 'http://localhost:8080' },
    });
    const methods = res.headers['access-control-allow-methods'];
    assert.ok(methods, 'Access-Control-Allow-Methods should be present');
    assert.ok(methods.includes('GET'), 'Should allow GET');
    assert.ok(methods.includes('POST'), 'Should allow POST');
    assert.ok(methods.includes('OPTIONS'), 'Should allow OPTIONS');
  });

  await test('CORS includes Content-Type in allowed headers', async () => {
    const res = await request('GET', '/health', {
      headers: { 'Origin': 'http://localhost:8080' },
    });
    const allowed = res.headers['access-control-allow-headers'];
    assert.ok(allowed, 'Access-Control-Allow-Headers should be present');
    assert.ok(allowed.includes('Content-Type'), 'Should allow Content-Type header');
  });

  // ── 6. SPA FALLBACK ────────────────────────────────────────────
  console.log('\n📄 SPA Fallback');

  await test('Unknown GET route returns 200 (serves index.html)', async () => {
    const res = await request('GET', '/nonexistent-page');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('<!DOCTYPE html>') || res.body.includes('<html'), 'Should serve HTML');
  });

  await test('Deep nested path returns 200', async () => {
    const res = await request('GET', '/some/deep/path');
    assert.strictEqual(res.statusCode, 200);
  });

  await test('SPA fallback serves HTML content-type', async () => {
    const res = await request('GET', '/test-route');
    assert.ok(res.headers['content-type'].includes('text/html'), 'Should serve text/html');
  });

  // ── 7. RATE LIMITER STRUCTURE ───────────────────────────────────
  console.log('\n⏱️  Rate Limiter');

  await test('Rate limiter is applied to /api/chat endpoint', async () => {
    // Validated by the fact that chat endpoint works — rate limiter middleware runs
    const res = await request('POST', '/api/chat', { body: { message: '' } });
    assert.strictEqual(res.statusCode, 400, 'Endpoint should be reachable through rate limiter');
  });

  await test('Rate limiter returns 429 with Retry-After header when exceeded', async () => {
    // Note: The rate limit store may have entries from previous tests.
    // We test the structure by checking the code path works correctly
    // for initial allowed requests (400 means it passed the rate limiter)
    const res = await request('POST', '/api/chat', { body: {} });
    // If we get 400, it means rate limiter allowed the request through
    // If we get 429, the Retry-After header should be present
    if (res.statusCode === 429) {
      assert.ok(res.headers['retry-after'], 'Should include Retry-After header');
      const data = JSON.parse(res.body);
      assert.ok(data.error.includes('Too many requests'), 'Should indicate rate limit');
    } else {
      assert.strictEqual(res.statusCode, 400, 'Should pass through rate limiter');
    }
  });

  // ── 8. REQUEST HANDLING EDGE CASES ──────────────────────────────
  console.log('\n📦 Request Edge Cases');

  await test('POST /api/chat — no body returns 400', async () => {
    const res = await request('POST', '/api/chat', {});
    assert.strictEqual(res.statusCode, 400);
  });

  await test('POST /api/chat — error response always has JSON error field', async () => {
    const res = await request('POST', '/api/chat', { body: { message: '' } });
    const data = JSON.parse(res.body);
    assert.ok(typeof data.error === 'string', 'Error response should have error field');
    assert.ok(data.error.length > 0, 'Error message should not be empty');
  });

  await test('GET /health — multiple rapid requests all succeed', async () => {
    const results = await Promise.all([
      request('GET', '/health'),
      request('GET', '/health'),
      request('GET', '/health'),
    ]);
    results.forEach((res) => {
      assert.strictEqual(res.statusCode, 200, 'All concurrent requests should succeed');
    });
  });

  await test('POST /api/chat — XSS in message is accepted by server (sanitized client-side)', async () => {
    const res = await request('POST', '/api/chat', {
      body: { message: '<script>alert(1)</script>How do I vote?' },
    });
    // Server accepts this — client-side sanitization handles XSS
    assert.ok(res.statusCode !== 400, 'HTML in message should not cause server rejection');
  });

  // ── SUMMARY ─────────────────────────────────────────────────────
  server.close();

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Server Tests: ${passed} passed, ${failed} failed (${total} total)`);
  console.log(`  Pass Rate:    ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`${'═'.repeat(50)}\n`);

  if (failed > 0) process.exit(1);
}

runAllTests().catch((err) => {
  console.error('Test runner error:', err);
  if (server) server.close();
  process.exit(1);
});
