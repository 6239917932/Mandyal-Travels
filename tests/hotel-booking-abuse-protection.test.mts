import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = await readFile('app/api/v1/hotels/bookings/route.ts', 'utf8');
const rateLimit = await readFile('lib/auth/rateLimit.ts', 'utf8');

test('hotel booking creation requires a same-origin portal request', () => {
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /FORBIDDEN_ORIGIN/);
});

test('hotel booking creation is throttled before processing a booking', () => {
  assert.match(route, /action: 'HOTEL_BOOKING_CREATE'/);
  assert.match(route, /limit: 8/);
  assert.match(route, /windowMs: 15 \* 60 \* 1000/);
  assert.match(route, /Retry-After/);
  assert.match(rateLimit, /\| 'HOTEL_BOOKING_CREATE'/);

  assert.ok(
    route.indexOf('isSameOriginMutation(request)') <
      route.indexOf("request.headers.get('Idempotency-Key')"),
    'origin validation must happen before booking processing',
  );
  assert.ok(
    route.indexOf("action: 'HOTEL_BOOKING_CREATE'") <
      route.indexOf("request.headers.get('Idempotency-Key')"),
    'rate limiting must happen before booking processing',
  );
});
