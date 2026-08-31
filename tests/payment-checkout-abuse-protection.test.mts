import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = await readFile('app/api/v1/payments/checkout-intents/route.ts', 'utf8');
const rateLimit = await readFile('lib/auth/rateLimit.ts', 'utf8');

test('live payment checkout is throttled before request or quote processing', () => {
  assert.match(route, /action: 'PAYMENT_CHECKOUT_CREATE'/);
  assert.match(route, /limit: 6/);
  assert.match(route, /windowMs: 15 \* 60 \* 1000/);
  assert.match(route, /Retry-After/);
  assert.match(rateLimit, /\| 'PAYMENT_CHECKOUT_CREATE'/);

  assert.ok(
    route.indexOf("action: 'PAYMENT_CHECKOUT_CREATE'") < route.indexOf('readJsonObject(request)'),
    'rate limiting must happen before request processing',
  );
  assert.ok(
    route.indexOf("action: 'PAYMENT_CHECKOUT_CREATE'") <
      route.indexOf('prisma.paymentCheckoutIntent.findUnique'),
    'rate limiting must happen before payment database lookups',
  );
});

test('disabled payments remain fail-closed without consuming a rate-limit record', () => {
  assert.ok(
    route.indexOf("isPlatformFeatureEnabled('LIVE_MARKETPLACE_PAYMENTS')") <
      route.indexOf("action: 'PAYMENT_CHECKOUT_CREATE'"),
    'the launch gate must be evaluated before rate-limit persistence',
  );
});
