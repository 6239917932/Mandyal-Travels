import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('public security disclosure publishes a monitored contact and canonical URL', () => {
  const disclosure = readFileSync('public/.well-known/security.txt', 'utf8');

  assert.match(disclosure, /^Contact: mailto:contact@mandyaltravels\.com$/m);
  assert.match(
    disclosure,
    /^Canonical: https:\/\/mandyaltravels\.com\/\.well-known\/security\.txt$/m,
  );
  assert.match(disclosure, /^Policy: https:\/\/mandyaltravels\.com\/legal\/safety-grievances$/m);
  assert.match(disclosure, /^Expires: 2027-08-31T23:59:59\.000Z$/m);
});

test('administrator console warns when the signed-in administrator has not enrolled MFA', () => {
  const page = readFileSync('app/admin/page.tsx', 'utf8');
  const manager = readFileSync('components/account/MfaSecurityManager.tsx', 'utf8');

  assert.match(page, /where: \{ userId: administrator\.id \}/);
  assert.match(page, /!administratorMfa\?\.enabledAt/);
  assert.match(page, /Protect this administrator account with two-step verification/);
  assert.match(page, /href="\/account\/settings#two-step-verification"/);
  assert.match(manager, /id="two-step-verification"/);
});
