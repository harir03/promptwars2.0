/**
 * VoterPath — Unit Test Suite
 * Run with: node tests/unit.test.js
 */

'use strict';

// Import pure functions from script.js via module.exports
const { getStateData, sanitizeInput, getPhaseIndex, getNextPhase } = require('../public/script.js');

const assert = require('assert');
let passed = 0;
let failed = 0;

/** Runs a named test and records result. */
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

// ── State Deadline Lookup ────────────────────────────────────────────────────
console.log('\n📋 State Deadline Lookup');
test('Returns data for valid state (Texas)', () => {
  const r = getStateData('Texas');
  assert.ok(r !== null, 'Should return data');
  assert.ok(r.deadline.includes('30 days'), 'Texas deadline should be 30 days');
});
test('Returns data for valid state (California)', () => {
  assert.strictEqual(getStateData('California').sameDay, true);
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
test('North Dakota has no registration required', () => {
  assert.ok(getStateData('North Dakota').deadline.includes('No registration'));
});

// ── Input Sanitization ───────────────────────────────────────────────────────
console.log('\n🔒 Input Sanitization');
test('Strips HTML tags', () => {
  assert.ok(!sanitizeInput('<script>alert(1)</script>Hello').includes('<script>'));
});
test('Preserves safe text after stripping', () => {
  assert.ok(sanitizeInput('<b>Hello</b>').includes('Hello'));
});
test('Blocks javascript: protocol', () => {
  assert.ok(!sanitizeInput('javascript:alert(1)').includes('javascript:'));
});
test('Truncates to maxLength', () => {
  assert.strictEqual(sanitizeInput('a'.repeat(600), 500).length, 500);
});
test('Returns empty string for null input', () => {
  assert.strictEqual(sanitizeInput(null), '');
});
test('Returns empty string for empty input', () => {
  assert.strictEqual(sanitizeInput(''), '');
});

// ── Phase Navigation ─────────────────────────────────────────────────────────
console.log('\n🗺️  Phase Navigation');
test('getPhaseIndex — registration is 0', () => {
  assert.strictEqual(getPhaseIndex('registration'), 0);
});
test('getPhaseIndex — results is 3', () => {
  assert.strictEqual(getPhaseIndex('results'), 3);
});
test('getPhaseIndex — case-insensitive', () => {
  assert.strictEqual(getPhaseIndex('VOTING'), 2);
});
test('getPhaseIndex — unknown returns -1', () => {
  assert.strictEqual(getPhaseIndex('unknown'), -1);
});
test('getNextPhase — research follows registration', () => {
  assert.strictEqual(getNextPhase('registration'), 'research');
});
test('getNextPhase — voting follows research', () => {
  assert.strictEqual(getNextPhase('research'), 'voting');
});
test('getNextPhase — null for last phase', () => {
  assert.strictEqual(getNextPhase('results'), null);
});
test('getNextPhase — null for unknown phase', () => {
  assert.strictEqual(getNextPhase('xyz'), null);
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
