import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const surfaces = [
  ['app/api/v1/hotels/discovery/route.ts', 'HOTEL_DISCOVERY', 30],
  ['app/api/v1/hotels/quotes/route.ts', 'HOTEL_QUOTE', 20],
  ['app/api/v1/promotions/validate/route.ts', 'PROMOTION_VALIDATE', 60],
] as const;

test('public commerce helpers reject cross-site use and apply bounded throttles', () => {
  for (const [path, action, limit] of surfaces) {
    const source = readFileSync(path, 'utf8');
    const originGuard = source.indexOf('isSameOriginMutation(request)');
    const bodyRead = source.indexOf('readJsonObject(request');

    assert.notEqual(originGuard, -1, `${path} must verify the portal origin`);
    assert.ok(originGuard < bodyRead, `${path} must reject untrusted origins before reading input`);
    assert.match(source, new RegExp(`action: '${action}'`));
    assert.match(source, new RegExp(`limit: ${limit}`));
    assert.match(source, /windowMs: 10 \* 60 \* 1000/);
    assert.match(source, /'Retry-After'/);
  }
});

test('commerce throttles are visible in the administrator security posture', () => {
  const service = readFileSync('services/adminSecurityPostureService.ts', 'utf8');
  const page = readFileSync('app/admin/security/page.tsx', 'utf8');

  for (const [, action] of surfaces) {
    assert.match(service, new RegExp(`'${action}'`));
    assert.match(page, new RegExp(`value="${action}"`));
  }
});
