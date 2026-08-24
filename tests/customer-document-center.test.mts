import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CUSTOMER_DOCUMENT_MAX_PAGE,
  CUSTOMER_DOCUMENT_PAGE_SIZE,
  CUSTOMER_DOCUMENT_RESULT_CAP,
  boundedCustomerDocumentPage,
  cappedCustomerDocumentCount,
  customerDocumentCenterPath,
  customerDocumentPageCount,
  safeTransportDocumentLink,
} from '../lib/customerDocuments.ts';

test('customer document pagination is positive, bounded, and stable', () => {
  assert.equal(CUSTOMER_DOCUMENT_PAGE_SIZE, 20);
  assert.equal(CUSTOMER_DOCUMENT_RESULT_CAP, 500);
  assert.equal(CUSTOMER_DOCUMENT_MAX_PAGE, 25);
  assert.equal(boundedCustomerDocumentPage(undefined), 1);
  assert.equal(boundedCustomerDocumentPage('-2'), 1);
  assert.equal(boundedCustomerDocumentPage('2.5'), 1);
  assert.equal(boundedCustomerDocumentPage(['4', '9']), 4);
  assert.equal(boundedCustomerDocumentPage('999999'), 25);
  assert.equal(cappedCustomerDocumentCount(-8), 0);
  assert.equal(cappedCustomerDocumentCount(800), 500);
  assert.equal(customerDocumentPageCount(0), 1);
  assert.equal(customerDocumentPageCount(41), 3);
  assert.equal(
    customerDocumentCenterPath({ hotelPage: -3, tripPage: 99 }),
    '/account/documents?hotelPage=1&tripPage=25',
  );
});

test('flight document links are rebuilt from a closed public query allowlist', () => {
  const link = safeTransportDocumentLink({
    confirmationCode: 'MF0123456789AB',
    detailsJson: JSON.stringify({
      documentQuery:
        'offerId=flight.offer-1&origin=DEL&destination=BOM&adults=2&providerRef=private&paymentStatus=CAPTURED&token=secret&origin=duplicate',
      providerPayload: { secret: true },
    }),
    productType: 'FLIGHT',
    status: 'CONFIRMED',
  });

  assert.deepEqual(link, {
    href: '/flights/booking/MF0123456789AB/itinerary?offerId=flight.offer-1&origin=DEL&destination=BOM&adults=2',
    label: 'Open prototype flight itinerary',
  });
  assert.doesNotMatch(link?.href ?? '', /provider|payment|token|secret|duplicate/i);
});

test('bus and car links preserve only their product-specific public criteria', () => {
  assert.deepEqual(
    safeTransportDocumentLink({
      confirmationCode: 'MB0123456789AB',
      detailsJson: JSON.stringify({
        documentQuery: 'offerId=bus-1&origin=Delhi&destination=Shimla&seats=12A%2C12B&drivers=9',
      }),
      productType: 'BUS',
      status: 'confirmed',
    }),
    {
      href: '/buses/booking/MB0123456789AB/ticket?offerId=bus-1&origin=Delhi&destination=Shimla&seats=12A%2C12B',
      label: 'Open prototype bus ticket',
    },
  );
  assert.deepEqual(
    safeTransportDocumentLink({
      confirmationCode: 'MC0123456789AB',
      detailsJson: JSON.stringify({
        documentQuery:
          'offerId=car-1&pickupLocation=Jaipur&dropoffLocation=Udaipur&rentalMode=outstation&passengers=4',
      }),
      productType: 'CAR',
      status: 'CONFIRMED',
    }),
    {
      href: '/cars/booking/MC0123456789AB/voucher?offerId=car-1&pickupLocation=Jaipur&dropoffLocation=Udaipur&rentalMode=outstation',
      label: 'Open prototype car rental voucher',
    },
  );
});

test('transport document links fail closed for untrusted or incomplete records', () => {
  const baseline = {
    confirmationCode: 'MF0123456789AB',
    detailsJson: JSON.stringify({ documentQuery: 'offerId=flight-1&origin=DEL' }),
    productType: 'FLIGHT',
    status: 'CONFIRMED',
  };
  assert.equal(safeTransportDocumentLink({ ...baseline, status: 'PENDING' }), null);
  assert.equal(safeTransportDocumentLink({ ...baseline, productType: 'HOTEL' }), null);
  assert.equal(safeTransportDocumentLink({ ...baseline, confirmationCode: '../private' }), null);
  assert.equal(safeTransportDocumentLink({ ...baseline, detailsJson: '{broken' }), null);
  assert.equal(
    safeTransportDocumentLink({
      ...baseline,
      detailsJson: JSON.stringify({ documentQuery: 'origin=DEL' }),
    }),
    null,
  );
  assert.equal(
    safeTransportDocumentLink({
      ...baseline,
      detailsJson: JSON.stringify({ documentQuery: 'offerId=https%3A%2F%2Fevil.example' }),
    }),
    null,
  );
});

test('the document index uses exact account ownership and returns bounded safe DTOs', async () => {
  const service = await readFile(
    new URL('../services/customerDocumentService.ts', import.meta.url),
    'utf8',
  );
  assert.match(service, /const tripWhere = \{ userId: input\.userId \} as const/);
  assert.match(service, /const hotelWhere = \{ email: input\.email \} as const/);
  assert.doesNotMatch(service, /OR:\s*\[/);
  assert.match(service, /take: CUSTOMER_DOCUMENT_PAGE_SIZE/g);
  assert.match(service, /safeTransportDocumentLink\(trip\)/);
  assert.doesNotMatch(service, /detailsJson:\s*trip\.detailsJson/);
  assert.doesNotMatch(service, /providerRef|supplierPayload|paymentToken/);
  assert.match(service, /not a statutory tax invoice/);
  assert.match(service, /Provider fulfillment and final provider documents remain pending/);
});

test('the page and API require a live authenticated account and expose recovery states', async () => {
  const [route, page, loading, errorBoundary] = await Promise.all([
    readFile(new URL('../app/api/v1/account/documents/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/account/documents/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/account/documents/loading.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/account/documents/error.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(route, /getCurrentUser\(\)/);
  assert.match(route, /status: 401/);
  assert.match(route, /email: user\.email/);
  assert.match(route, /userId: user\.id/);
  assert.match(page, /redirect\('\/login\?returnTo=%2Faccount%2Fdocuments'\)/);
  assert.match(page, /not statutory GST tax\s+invoices/);
  assert.match(page, /live providers complete fulfillment/);
  assert.match(page, /No documents are available in this section yet/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(errorBoundary, /role="alert"/);
  assert.match(errorBoundary, /onClick=\{reset\}/);
});
