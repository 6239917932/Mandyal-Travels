import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = await readFile('app/api/v1/partners/applications/route.ts', 'utf8');
const rateLimit = await readFile('lib/auth/rateLimit.ts', 'utf8');

test('supplier applications require portal origin and authenticated throttling', () => {
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /FORBIDDEN_ORIGIN/);
  assert.match(route, /action: 'PARTNER_APPLICATION_CREATE'/);
  assert.match(route, /getRequestRateLimitIdentifier\(request, user\.id\)/);
  assert.match(route, /limit: 3/);
  assert.match(route, /windowMs: 24 \* 60 \* 60 \* 1000/);
  assert.match(route, /Retry-After/);
  assert.match(rateLimit, /\| 'PARTNER_APPLICATION_CREATE'/);
});

test('paused onboarding fails closed before rate-limit persistence or body parsing', () => {
  assert.ok(
    route.indexOf("isPlatformFeatureEnabled('PARTNER_APPLICATIONS')") <
      route.indexOf("action: 'PARTNER_APPLICATION_CREATE'"),
  );
  assert.ok(
    route.indexOf("action: 'PARTNER_APPLICATION_CREATE'") <
      route.indexOf('readJsonObject(request)'),
  );
});
