import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  manageBookingLookupError,
  normalizeManageBookingReference,
  readManagedTransportTrip,
} from '../services/customerManageBookingRules.ts';

test('manage-booking references normalize into one closed product route', () => {
  assert.deepEqual(normalizeManageBookingReference(' mt0123456789ab '), {
    confirmationCode: 'MT0123456789AB',
    kind: 'HOTEL',
  });
  assert.deepEqual(normalizeManageBookingReference('mf0123456789ab'), {
    confirmationCode: 'MF0123456789AB',
    kind: 'TRANSPORT',
    productType: 'FLIGHT',
  });
  assert.equal(normalizeManageBookingReference('MB0123456789AB')?.kind, 'TRANSPORT');
  assert.equal(normalizeManageBookingReference('MC0123456789AB')?.kind, 'TRANSPORT');
  assert.equal(normalizeManageBookingReference('MX0123456789AB'), undefined);
  assert.equal(normalizeManageBookingReference('MT-short'), undefined);
  assert.equal(normalizeManageBookingReference(`MT${'A'.repeat(21)}`), undefined);
});

test('recoverable lookup errors prefer outages without exposing inaccessible references', () => {
  assert.match(manageBookingLookupError(503), /temporarily unavailable/i);
  assert.match(manageBookingLookupError(500), /temporarily unavailable/i);
  assert.equal(manageBookingLookupError(401), manageBookingLookupError(403));
  assert.doesNotMatch(manageBookingLookupError(401), /exists|found for another/i);
  assert.match(manageBookingLookupError(404), /could not find/i);
});

test('transport results must match the normalized product and reference', () => {
  const expected = normalizeManageBookingReference('MF0123456789AB');
  assert.ok(expected && expected.kind === 'TRANSPORT');
  const trip = {
    confirmationCode: 'MF0123456789AB',
    currency: 'INR',
    endDate: null,
    productType: 'FLIGHT',
    startDate: '2026-09-20',
    status: 'CONFIRMED',
    subtitle: 'Mandyal Air 204',
    title: 'DEL to SXR',
    totalAmount: 12_500,
  };
  assert.deepEqual(readManagedTransportTrip(trip, expected), trip);
  assert.equal(readManagedTransportTrip({ ...trip, productType: 'BUS' }, expected), undefined);
  assert.equal(
    readManagedTransportTrip({ ...trip, confirmationCode: 'MF9999999999AA' }, expected),
    undefined,
  );
  assert.equal(
    readManagedTransportTrip({ ...trip, status: 'PROVIDER_PENDING' }, expected),
    undefined,
  );
});

test('lookup component chooses one endpoint and preserves hotel servicing controls', async () => {
  const [component, page] = await Promise.all([
    readFile(new URL('../components/booking/ManageBookingLookup.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/manage-booking/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(component, /reference\.kind === 'HOTEL'/);
  assert.match(component, /\/api\/v1\/hotels\/bookings\//);
  assert.match(component, /\/api\/v1\/trips\//);
  assert.doesNotMatch(component, /tripResponse|hotelResponse/);
  assert.match(component, /method: 'DELETE'/);
  assert.match(component, /\/amendments/);
  assert.match(component, /View voucher/);
  assert.match(component, /View receipt/);
  assert.match(component, /customerTripServicingPath/);
  assert.match(component, /AbortController/);
  assert.match(page, /<ManageBookingLookup \/>/);
  assert.doesNotMatch(page, /fetch\(|useState|confirmationCode/);
});
