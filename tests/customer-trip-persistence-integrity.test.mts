import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  customerOwnsTrip,
  canonicalCustomerTripJson,
  createCustomerTripDetailsJson,
  customerTripContextsMatch,
  customerTripImmutableFingerprint,
  customerTripResponse,
  normalizeCustomerTripReference,
  type CustomerTripImmutableContext,
} from '../services/customerTripPersistenceRules.ts';

const context = (overrides: Partial<CustomerTripImmutableContext> = {}) => ({
  businessTravelRequestId: null,
  confirmationCode: 'MF0123456789AB',
  currency: 'INR',
  detailsJson: JSON.stringify({ passengerDraft: { firstName: 'Private' } }),
  endDate: null,
  productType: 'FLIGHT',
  startDate: '2026-09-20',
  status: 'CONFIRMED',
  subtitle: 'Mandyal Air MT 204',
  title: 'DEL to SXR',
  totalAmount: 12_500,
  ...overrides,
});

test('confirmation prefixes bind to exactly one transport product', () => {
  assert.deepEqual(normalizeCustomerTripReference(' mf0123456789ab '), {
    confirmationCode: 'MF0123456789AB',
    productType: 'FLIGHT',
  });
  assert.equal(normalizeCustomerTripReference('MB0123456789AB')?.productType, 'BUS');
  assert.equal(normalizeCustomerTripReference('MC0123456789AB')?.productType, 'CAR');
  assert.equal(normalizeCustomerTripReference('MT0123456789AB'), undefined);
  assert.equal(normalizeCustomerTripReference('MF-too-short'), undefined);
});

test('ownership uses exact user ID and limits email fallback to unassigned legacy rows', () => {
  const owner = { email: ' Customer@Example.com ', userId: 'user-current' };
  assert.equal(
    customerOwnsTrip({ email: 'other@example.com', userId: 'user-current' }, owner),
    true,
  );
  assert.equal(customerOwnsTrip({ email: 'customer@example.com', userId: null }, owner), true);
  assert.equal(
    customerOwnsTrip({ email: 'customer@example.com', userId: 'user-other' }, owner),
    false,
  );
  assert.equal(customerOwnsTrip({ email: '', userId: null }, { email: '', userId: 'user' }), false);
});

test('immutable retries require every booking field and private payload digest to match', () => {
  const original = context();
  assert.equal(customerTripContextsMatch(original, { ...original }), true);
  assert.equal(customerTripContextsMatch(original, context({ totalAmount: 12_501 })), false);
  assert.equal(customerTripContextsMatch(original, context({ productType: 'BUS' })), false);
  assert.equal(
    customerTripContextsMatch(
      original,
      context({ detailsJson: JSON.stringify({ changed: true }) }),
    ),
    false,
  );
  assert.equal(
    customerTripContextsMatch(original, context({ businessTravelRequestId: 'request-1' })),
    false,
  );
  assert.match(customerTripImmutableFingerprint(original), /^[a-f0-9]{64}$/);
  assert.doesNotMatch(customerTripImmutableFingerprint(original), /Private/);
});

test('nested private details are canonical and selection context is immutable', () => {
  assert.equal(
    canonicalCustomerTripJson({ outer: { zebra: 1, alpha: 2 }, beta: true }),
    canonicalCustomerTripJson({ beta: true, outer: { alpha: 2, zebra: 1 } }),
  );
  const first = createCustomerTripDetailsJson(
    { contact: { phone: '9999999999', email: 'customer@example.com' } },
    {
      offerId: 'offer-1',
      promotionCode: 'ROADTRIP',
      search: { passengers: '2', travelDate: '2026-09-20' },
      seats: ['1A', '1B'],
    },
  );
  const reordered = createCustomerTripDetailsJson(
    { contact: { email: 'customer@example.com', phone: '9999999999' } },
    {
      offerId: 'offer-1',
      promotionCode: 'ROADTRIP',
      search: { travelDate: '2026-09-20', passengers: '2' },
      seats: ['1A', '1B'],
    },
  );
  assert.equal(first, reordered);
  assert.notEqual(
    first,
    createCustomerTripDetailsJson(
      { contact: { email: 'customer@example.com', phone: '9999999999' } },
      {
        offerId: 'offer-2',
        promotionCode: 'ROADTRIP',
        search: { passengers: '2', travelDate: '2026-09-20' },
        seats: ['1A', '1B'],
      },
    ),
  );
  assert.notEqual(
    first,
    createCustomerTripDetailsJson(
      { contact: { email: 'customer@example.com', phone: '9999999999' } },
      {
        offerId: 'offer-1',
        promotionCode: 'DIFFERENT',
        search: { passengers: '2', travelDate: '2026-09-20' },
        seats: ['1A', '1B'],
      },
    ),
  );
  assert.notEqual(
    first,
    createCustomerTripDetailsJson(
      { contact: { email: 'customer@example.com', phone: '9999999999' } },
      {
        offerId: 'offer-1',
        promotionCode: 'ROADTRIP',
        search: { passengers: '2', travelDate: '2026-09-20' },
        seats: ['1A', '2A'],
      },
    ),
  );
  assert.equal(
    customerTripContextsMatch(
      context({ detailsJson: first! }),
      context({ detailsJson: reordered! }),
    ),
    true,
  );
});

test('public response is minimal, normalized, and fails closed on contradictory records', () => {
  assert.deepEqual(customerTripResponse(context()), {
    confirmationCode: 'MF0123456789AB',
    currency: 'INR',
    endDate: null,
    productType: 'FLIGHT',
    startDate: '2026-09-20',
    status: 'CONFIRMED',
    subtitle: 'Mandyal Air MT 204',
    title: 'DEL to SXR',
    totalAmount: 12_500,
  });
  assert.equal(customerTripResponse(context({ productType: 'BUS' })), undefined);
  assert.equal(customerTripResponse(context({ currency: 'USD' })), undefined);
  assert.equal(customerTripResponse(context({ startDate: '2026-02-30' })), undefined);
  assert.equal(customerTripResponse(context({ totalAmount: -1 })), undefined);
  assert.equal(
    customerTripResponse(context({ status: 'internal-provider-state' }))?.status,
    'UNDER_REVIEW',
  );
});

test('write and lookup routes keep private fields internal and resolve inside transactions', () => {
  const createRoute = readFileSync('app/api/v1/account/trips/route.ts', 'utf8');
  const lookupRoute = readFileSync('app/api/v1/trips/[confirmationCode]/route.ts', 'utf8');

  assert.match(createRoute, /reference\.productType !== productType/);
  assert.match(createRoute, /customerTripContextsMatch\(existing, requested\)/);
  assert.match(createRoute, /customerOwnsTrip\(existing, owner\)/);
  assert.match(createRoute, /prisma\.\$transaction\(async \(transaction\)/);
  assert.match(createRoute, /select: CUSTOMER_TRIP_INTEGRITY_SELECT/);
  assert.match(createRoute, /status: result\.created \? 201 : 200/);
  assert.match(createRoute, /action: 'CUSTOMER_TRIP_CREATE'/);
  assert.match(createRoute, /'Retry-After'/);
  const postRoute = createRoute.slice(createRoute.indexOf('export async function POST'));
  assert.ok(postRoute.indexOf('lookupExistingTrip') < postRoute.indexOf('const rateLimit'));
  assert.doesNotMatch(createRoute, /NextResponse\.json\(\{ data: (?:createdTrip|completedTrip) \}/);

  assert.match(lookupRoute, /trip\.productType === reference\.productType/);
  assert.match(lookupRoute, /customerOwnsTrip\(trip,/);
  assert.match(lookupRoute, /customerTripResponse\(trip\)/);
  assert.doesNotMatch(
    lookupRoute,
    /detailsJson|passengerDraft|driver|paymentStatus|providerRef|documentQuery/,
  );
});
