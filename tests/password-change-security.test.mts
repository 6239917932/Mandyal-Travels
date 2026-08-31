import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('password changes are origin protected, rate limited, and invalidate sessions', () => {
  const route = readFileSync('app/api/v1/account/password/route.ts', 'utf8');

  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /action: 'PASSWORD_CHANGE'/);
  assert.match(route, /limit: PASSWORD_CHANGE_ATTEMPT_LIMIT/);
  assert.match(route, /'Retry-After'/);
  assert.match(route, /prisma\.userSession\.deleteMany/);
  assert.match(route, /ACCOUNT_SECURITY_ACTIONS\.PASSWORD_CHANGED/);
  assert.match(route, /delete\(SESSION_COOKIE_NAME\)/);
});
