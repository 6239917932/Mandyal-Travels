import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createEmailOtpCode,
  EMAIL_OTP_MAX_ATTEMPTS,
  EMAIL_OTP_TTL_MS,
  hashEmailOtpCode,
  verifyEmailOtpHash,
} from '../lib/auth/emailOtp.ts';

test('email OTP codes are bounded, keyed, short-lived, and attempt limited', () => {
  const code = createEmailOtpCode();
  const secret = 'a-secure-test-secret-with-at-least-32-characters';
  const hash = hashEmailOtpCode('challenge-id', code, secret);

  assert.match(code, /^[0-9]{6}$/);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(verifyEmailOtpHash(hash, hashEmailOtpCode('challenge-id', code, secret)), true);
  assert.equal(verifyEmailOtpHash(hash, hashEmailOtpCode('challenge-id', '000000', secret)), false);
  assert.equal(EMAIL_OTP_TTL_MS, 10 * 60 * 1000);
  assert.equal(EMAIL_OTP_MAX_ATTEMPTS, 5);
});

test('email OTP is mandatory only behind an explicit delivery-ready flag', async () => {
  const [login, register, form, provider, example, releaseVerifier] = await Promise.all([
    readFile('app/api/v1/auth/login/route.ts', 'utf8'),
    readFile('app/api/v1/auth/register/route.ts', 'utf8'),
    readFile('components/auth/AuthForm.tsx', 'utf8'),
    readFile('services/emailProviderService.ts', 'utf8'),
    readFile('.env.example', 'utf8'),
    readFile('scripts/verify-release-env.mjs', 'utf8'),
  ]);

  assert.match(login, /isEmailOtpRequired\(\)/);
  assert.match(register, /purpose: 'REGISTRATION'/);
  assert.match(form, /name="emailOtpCode"/);
  assert.match(provider, /EMAIL_SMTP_ALLOWED_HOSTS/);
  assert.match(example, /AUTH_EMAIL_OTP_REQUIRED="false"/);
  assert.match(example, /SESSION_SECRET="replace-with-a-different-long-random-secret"/);
  assert.match(releaseVerifier, /'SESSION_SECRET'/);
  assert.match(releaseVerifier, /A configured SMTP or HTTPS email provider is required/);
});
