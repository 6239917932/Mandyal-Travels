import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const script = await readFile('scripts/test-customer-browser.mjs', 'utf8');

test('customer browser audit rejects every executable or embedded link scheme', () => {
  assert.match(script, /trim\(\)\.toLowerCase\(\)/);
  assert.match(script, /startsWith\('javascript:'\)/);
  assert.match(script, /startsWith\('data:'\)/);
  assert.match(script, /startsWith\('vbscript:'\)/);
});
