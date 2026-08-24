import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  adminDocumentPath,
  documentCreatedAtRange,
  hotelDocumentPosture,
  normalizeAdminDocumentFilters,
  privateDocumentSubject,
  tripDocumentPosture,
} from '../services/adminDocumentWorkbenchService.ts';

test('document workbench filters are closed, bounded, and preserve valid dates', () => {
  const filters = normalizeAdminDocumentFilters({
    from: '2026-08-01',
    hotelPage: '2',
    product: 'flight',
    q: `  ${'reference '.repeat(20)}  `,
    to: '2026-08-31',
    tripPage: '3',
  });
  assert.equal(filters.product, 'FLIGHT');
  assert.equal(filters.query.length, 100);
  assert.equal(
    adminDocumentPath(filters, { hotelPage: 2, tripPage: 3 }),
    `/admin/documents?hotelPage=2&tripPage=3&q=${filters.query.replaceAll(' ', '+')}&product=FLIGHT&from=2026-08-01&to=2026-08-31`,
  );
  assert.deepEqual(documentCreatedAtRange(filters.from, filters.to), {
    gte: new Date('2026-08-01T00:00:00.000Z'),
    lt: new Date('2026-09-01T00:00:00.000Z'),
  });
});

test('invalid products, pages, and reversed dates fail closed', () => {
  assert.deepEqual(
    normalizeAdminDocumentFilters({
      from: '2026-09-01',
      hotelPage: '-4',
      product: 'provider-secret',
      to: '2026-08-01',
      tripPage: '0',
    }),
    { from: '', hotelPage: 1, product: 'ALL', query: '', to: '', tripPage: 1 },
  );
});

const readyHotel = {
  amendmentStatuses: [],
  bookingCurrency: 'INR',
  bookingStatus: 'confirmed',
  bookingTotal: 12_500,
  paymentAmount: 12_500,
  paymentCurrency: 'INR',
  paymentStatus: 'captured',
  refundStatuses: [],
};

test('hotel readiness requires confirmed booking and matching captured payment', () => {
  assert.deepEqual(hotelDocumentPosture(readyHotel), {
    billing: 'READY',
    confirmation: 'READY',
    reason: 'Confirmed booking and matching captured payment evidence are present.',
  });
  assert.equal(hotelDocumentPosture({ ...readyHotel, paymentAmount: 12_000 }).billing, 'REVIEW');
  assert.equal(
    hotelDocumentPosture({ ...readyHotel, paymentStatus: 'pending' }).billing,
    'BLOCKED',
  );
  assert.equal(
    hotelDocumentPosture({ ...readyHotel, bookingStatus: 'cancelled' }).confirmation,
    'BLOCKED',
  );
});

test('unresolved amendments and refunds force human review', () => {
  assert.equal(
    hotelDocumentPosture({ ...readyHotel, amendmentStatuses: ['pending'] }).billing,
    'REVIEW',
  );
  assert.equal(
    hotelDocumentPosture({ ...readyHotel, refundStatuses: ['PROVIDER_FAILED'] }).confirmation,
    'REVIEW',
  );
});

test('transport confirmations never imply provider-backed billing evidence', () => {
  assert.deepEqual(tripDocumentPosture('CONFIRMED'), {
    billing: 'UNAVAILABLE',
    confirmation: 'READY',
    reason:
      'The operational confirmation is ready; provider-backed billing evidence is not stored.',
  });
  assert.equal(tripDocumentPosture('PENDING').confirmation, 'BLOCKED');
});

test('private subjects mask most of an operational reference', () => {
  assert.equal(privateDocumentSubject('MTABC123456'), 'MTA•••456');
  assert.equal(privateDocumentSubject('short'), 'SHORT');
});

test('document workbench is administrator-only and does not expose customer document links', async () => {
  const page = await readFile(new URL('../app/admin/documents/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /getPlatformAdmin\(\)/);
  assert.match(page, /redirect\('\/login\?returnTo=\/admin\/documents'\)/);
  assert.match(page, /does not create a\s+statutory GST invoice/);
  assert.doesNotMatch(page, /href=\{?`?\/manage-booking\//);
  assert.doesNotMatch(page, /providerRef/);
});
