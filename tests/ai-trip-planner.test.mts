import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { RuleBasedTripPlannerService } from '../services/aiTripPlannerService.ts';

const service = new RuleBasedTripPlannerService();
const input = {
  adults: 2,
  checkInDate: '2026-10-10',
  checkOutDate: '2026-10-13',
  destination: 'Bir Billing',
  destinationAirport: 'DHM',
  interests: ['Nature', 'Food', 'Nature'],
  origin: 'Delhi',
  originAirport: 'DEL',
};

test('trip planner creates editable guidance and real product search links', () => {
  const result = service.plan(input, '2026-08-15');
  assert.equal(result.days.length, 4);
  assert.match(result.summary, /3-night editable plan/);
  assert.deepEqual(
    result.links.map((link) => link.product),
    ['FLIGHT', 'HOTEL', 'BUS', 'CAR'],
  );
  assert.ok(result.links.every((link) => link.href.startsWith('/')));
  assert.match(result.disclosure, /not a booking or availability promise/);
});

test('trip planner rejects past, impossible, and overlong date ranges', () => {
  assert.throws(
    () => service.plan({ ...input, checkInDate: '2026-08-14' }, '2026-08-15'),
    /current or future/,
  );
  assert.throws(
    () => service.plan({ ...input, checkInDate: '2026-02-30' }, '2026-01-01'),
    /valid current or future/,
  );
  assert.throws(
    () => service.plan({ ...input, checkOutDate: '2026-11-20' }, '2026-08-15'),
    /between 1 and 30 nights/,
  );
});

test('flight link requires two distinct valid airport codes', () => {
  assert.equal(
    service
      .plan({ ...input, destinationAirport: '' }, '2026-08-15')
      .links.some((link) => link.product === 'FLIGHT'),
    false,
  );
  assert.equal(
    service
      .plan({ ...input, destinationAirport: 'DEL' }, '2026-08-15')
      .links.some((link) => link.product === 'FLIGHT'),
    false,
  );
});

test('traveller counts and location bounds are enforced', () => {
  assert.throws(() => service.plan({ ...input, adults: 10 }, '2026-08-15'), /between 1 and 9/);
  assert.throws(
    () => service.plan({ ...input, destination: ' ' }, '2026-08-15'),
    /origin and destination/,
  );
});

test('public trip planning is origin protected, rate limited, and operator visible', () => {
  const route = readFileSync('app/api/v1/ai/trip-plans/route.ts', 'utf8');
  const securityPage = readFileSync('app/admin/security/page.tsx', 'utf8');

  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /action: 'AI_TRIP_PLAN'/);
  assert.match(route, /limit: 12/);
  assert.match(route, /windowMs: 10 \* 60 \* 1000/);
  assert.match(route, /'Retry-After'/);
  assert.match(securityPage, /value="AI_TRIP_PLAN"/);
});
