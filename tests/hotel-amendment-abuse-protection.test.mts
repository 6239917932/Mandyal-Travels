import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('hotel amendment creation rejects cross-origin and abusive requests before processing', async () => {
  const [route, rateLimit] = await Promise.all([
    readFile('app/api/v1/hotels/bookings/[confirmationCode]/amendments/route.ts', 'utf8'),
    readFile('lib/auth/rateLimit.ts', 'utf8'),
  ]);
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /action: 'HOTEL_AMENDMENT_CREATE'/);
  assert.match(route, /'Retry-After'/);
  assert.match(rateLimit, /\| 'HOTEL_AMENDMENT_CREATE'/);
  assert.ok(
    route.indexOf('isSameOriginMutation(request)') < route.indexOf('readJsonObject(request)'),
  );
  assert.ok(route.indexOf('consumeRateLimit') < route.indexOf('readJsonObject(request)'));
});
