import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const script = await readFile('scripts/test-customer-browser.mjs', 'utf8');
const adminScript = await readFile('scripts/test-admin-browser.mjs', 'utf8');
const seedScript = await readFile('scripts/seed-admin-audit.mts', 'utf8');

test('customer browser audit rejects every executable or embedded link scheme', () => {
  assert.match(script, /trim\(\)\.toLowerCase\(\)/);
  assert.match(script, /startsWith\('javascript:'\)/);
  assert.match(script, /startsWith\('data:'\)/);
  assert.match(script, /startsWith\('vbscript:'\)/);
});

test('administrator access workflow cannot revoke the customer browser fixture session', () => {
  assert.match(seedScript, /'audit-access-user', 'CUSTOMER'/);
  assert.match(adminScript, /\/admin\/users\/audit-access-user/);
  assert.doesNotMatch(
    adminScript,
    /navigate\('\/admin\/users\/audit-customer'\)[\s\S]{0,800}Suspend account/,
  );
});

test('customer audit inspects the complete rendered document without depending on shell markup', () => {
  assert.match(script, /locator\('body'\)\.evaluate/);
  assert.doesNotMatch(script, /locator\('#workspace-main'\)\.evaluate/);
});
