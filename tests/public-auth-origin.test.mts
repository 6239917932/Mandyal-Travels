import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routes = [
  'app/api/v1/auth/login/route.ts',
  'app/api/v1/auth/register/route.ts',
  'app/api/v1/auth/password-reset/request/route.ts',
  'app/api/v1/auth/password-reset/confirm/route.ts',
];

test('public account access mutations require the portal origin before processing input', () => {
  for (const path of routes) {
    const source = readFileSync(path, 'utf8');
    const originGuard = source.indexOf('isSameOriginMutation(request)');
    const bodyRead = source.indexOf('readJsonObject(request)');

    assert.notEqual(originGuard, -1, `${path} must verify the portal origin`);
    assert.notEqual(bodyRead, -1, `${path} must read a bounded JSON object`);
    assert.ok(originGuard < bodyRead, `${path} must reject untrusted origins before reading input`);
  }
});

test('public account access routes retain abuse and credential controls', () => {
  const login = readFileSync(routes[0], 'utf8');
  const register = readFileSync(routes[1], 'utf8');
  const resetRequest = readFileSync(routes[2], 'utf8');
  const resetConfirm = readFileSync(routes[3], 'utf8');

  assert.match(login, /action: 'LOGIN'/);
  assert.match(login, /verifyUserSecondFactor/);
  assert.match(register, /action: 'REGISTER'/);
  assert.match(resetRequest, /action: 'PASSWORD_RESET_REQUEST'/);
  assert.match(resetConfirm, /action: 'PASSWORD_RESET_CONFIRM'/);
  assert.match(resetConfirm, /userSession\.deleteMany/);
});
