import assert from 'node:assert/strict';
import test from 'node:test';

import {
  customerTripServicingPath,
  normalizeCustomerSupportPrefill,
} from '../services/customerTripServicingService.ts';

test('trip servicing links prefill a booking-owned human review request', () => {
  const path = customerTripServicingPath({
    confirmationCode: 'mt-flight-1001',
    productType: 'flight',
  });
  const url = new URL(path, 'https://mandyaltravels.com');

  assert.equal(url.pathname, '/account/support');
  assert.equal(url.searchParams.get('bookingReference'), 'MT-FLIGHT-1001');
  assert.equal(url.searchParams.get('category'), 'BOOKING');
  assert.match(url.searchParams.get('subject') ?? '', /FLIGHT MT-FLIGHT-1001/);
  assert.match(url.searchParams.get('message') ?? '', /does not automatically change or cancel/);
  assert.match(url.searchParams.get('message') ?? '', /does not guarantee a refund/);
});

test('support prefills accept bounded valid values', () => {
  assert.deepEqual(
    normalizeCustomerSupportPrefill({
      bookingReference: ' mt-car-1234 ',
      category: 'booking',
      message: 'Please move my pickup time.',
      subject: 'Change pickup time',
    }),
    {
      bookingReference: 'MT-CAR-1234',
      category: 'BOOKING',
      message: 'Please move my pickup time.',
      subject: 'Change pickup time',
    },
  );
});

test('support prefills reject invalid references and clamp untrusted query values', () => {
  const normalized = normalizeCustomerSupportPrefill({
    bookingReference: '<script>',
    category: 'administrator',
    message: 'm'.repeat(2100),
    subject: ['s'.repeat(150), 'ignored'],
  });

  assert.equal(normalized.bookingReference, '');
  assert.equal(normalized.category, 'BOOKING');
  assert.equal(normalized.message.length, 2000);
  assert.equal(normalized.subject.length, 120);
});
