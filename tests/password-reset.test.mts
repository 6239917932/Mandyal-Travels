import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createPasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from '../lib/auth/passwordReset.ts';

test('password reset tokens are random, hashed, bounded, and short-lived', () => {
  const now = new Date('2026-08-23T12:00:00.000Z');
  const first = createPasswordResetToken(now);
  const second = createPasswordResetToken(now);

  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.match(first.tokenHash, /^[a-f0-9]{64}$/);
  assert.notEqual(first.token, first.tokenHash);
  assert.notEqual(first.token, second.token);
  assert.equal(hashPasswordResetToken(first.token), first.tokenHash);
  assert.equal(first.expiresAt.getTime() - now.getTime(), PASSWORD_RESET_TOKEN_TTL_MS);
});

test('password reset token hashing rejects malformed input', () => {
  assert.equal(hashPasswordResetToken(''), null);
  assert.equal(hashPasswordResetToken('not-a-token'), null);
  assert.equal(hashPasswordResetToken('a'.repeat(63)), null);
  assert.equal(hashPasswordResetToken('z'.repeat(64)), null);
});

test('recovery stays account-neutral and reset secrets use URL fragments', async () => {
  const [requestRoute, resetService, registrationRoute] = await Promise.all([
    readFile('app/api/v1/auth/password-reset/request/route.ts', 'utf8'),
    readFile('services/passwordResetService.ts', 'utf8'),
    readFile('app/api/v1/auth/register/route.ts', 'utf8'),
  ]);

  assert.match(requestRoute, /If an account uses that email address/);
  assert.match(requestRoute, /after\(\(\) => sendPasswordResetEmail/);
  assert.match(resetService, /reset-password#token=/);
  assert.doesNotMatch(registrationRoute, /role:\s*['"]PLATFORM_ADMIN['"]/);
});
