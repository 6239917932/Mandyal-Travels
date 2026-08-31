import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { isAcceptableNewPassword, isValidPassword } from '../lib/auth/validation.ts';

test('existing credentials retain length validation for backward-compatible sign in', () => {
  assert.equal(isValidPassword('password123'), true);
  assert.equal(isValidPassword('short'), false);
  assert.equal(isValidPassword('x'.repeat(129)), false);
});

test('new credentials reject common and repeated passwords', () => {
  for (const password of ['password123', ' PASSWORD123 ', '1234567890', 'aaaaaaaaaa']) {
    assert.equal(isAcceptableNewPassword(password), false, password);
  }
});

test('new credentials accept long memorable passwords without composition rules', () => {
  assert.equal(isAcceptableNewPassword('Clouds cross the Dhauladhar at dusk'), true);
  assert.equal(isAcceptableNewPassword('two-rivers-meet-near-bir-2042'), true);
});

test('all new-password paths use quality screening without weakening password-change origin checks', () => {
  const registration = readFileSync('app/api/v1/auth/register/route.ts', 'utf8');
  const reset = readFileSync('app/api/v1/auth/password-reset/confirm/route.ts', 'utf8');
  const change = readFileSync('app/api/v1/account/password/route.ts', 'utf8');
  assert.match(change, /Clear-Site-Data/);

  assert.match(registration, /isAcceptableNewPassword\(password\)/);
  assert.match(reset, /isAcceptableNewPassword\(newPassword\)/);
  assert.match(change, /isAcceptableNewPassword\(newPassword\)/);
  assert.match(change, /isSameOriginMutation\(request\)/);
});
