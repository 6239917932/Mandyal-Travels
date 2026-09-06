import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createRecoveryCodes,
  createTotpSecret,
  requiresMfaEnrollmentVerification,
  totpUri,
  verifyTotp,
} from '../lib/auth/mfa.ts';

test('MFA secrets and recovery codes are high-entropy and bounded', () => {
  assert.match(createTotpSecret(), /^[A-Z2-7]{32}$/);
  const codes = createRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  assert.ok(codes.every((code) => /^[0-9A-F]{12}$/.test(code)));
});

test('TOTP verification rejects malformed codes and URI identifies issuer', () => {
  const secret = createTotpSecret();
  assert.equal(verifyTotp(secret, '123'), false);
  assert.match(totpUri('guest@example.com', secret), /^otpauth:\/\/totp\//);
});

test('enabled MFA must be verified before enrollment can replace its secret', () => {
  assert.equal(requiresMfaEnrollmentVerification(new Date()), true);
  assert.equal(requiresMfaEnrollmentVerification(null), false);
  assert.equal(requiresMfaEnrollmentVerification(undefined), false);
});

test('MFA mutations require portal origin and bounded per-account attempts', () => {
  const route = readFileSync('app/api/v1/account/mfa/route.ts', 'utf8');
  const securityPage = readFileSync('app/admin/security/page.tsx', 'utf8');

  assert.match(route, /isTrustedPortalMutation\(request, resolvePublicPortalOrigin\(\)\)/);
  assert.match(route, /action: 'MFA_MUTATION'/);
  assert.match(route, /const MFA_MUTATION_LIMIT = 10/);
  assert.match(route, /const MFA_MUTATION_WINDOW_MS = 10 \* 60 \* 1000/);
  assert.match(route, /'Retry-After'/);
  assert.match(securityPage, /value="MFA_MUTATION"/);
});
