import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CUSTOMER_SUPPORT_ABSOLUTE_RECORD_LIMIT,
  CUSTOMER_SUPPORT_BODY_LIMIT_BYTES,
  CUSTOMER_SUPPORT_MAX_PAGE,
  CUSTOMER_SUPPORT_PAGE_SIZE,
  customerServicingSubject,
  customerSupportCategoryLabel,
  customerSupportPublicStatusLabel,
  isDirectSameOriginSupportMutation,
  isTransportServicingIntentAllowed,
  normalizeCustomerBookingReference,
  normalizeCustomerSupportFilters,
  readCustomerServicingIntent,
  readCustomerSupportCategory,
} from '../services/customerServicingIntentRules.ts';

const serviceSource = await readFile(
  new URL('../services/customerSupportCenterService.ts', import.meta.url),
  'utf8',
);
const routeSource = await readFile(
  new URL('../app/api/v1/account/support/route.ts', import.meta.url),
  'utf8',
);
const pageSource = await readFile(
  new URL('../app/account/support/page.tsx', import.meta.url),
  'utf8',
);
const componentSource = await readFile(
  new URL('../components/account/CustomerSupportCenter.tsx', import.meta.url),
  'utf8',
);

test('support inputs use closed catalogues and bounded references', () => {
  assert.equal(readCustomerSupportCategory(' booking '), 'BOOKING');
  assert.equal(readCustomerSupportCategory('REFUND_APPROVED'), null);
  assert.equal(readCustomerServicingIntent('change_request'), 'CHANGE_REQUEST');
  assert.equal(readCustomerServicingIntent('AUTO_CANCEL'), null);
  assert.equal(normalizeCustomerBookingReference(' mb12345678 '), 'MB12345678');
  assert.equal(normalizeCustomerBookingReference('../booking'), null);
  assert.equal(CUSTOMER_SUPPORT_BODY_LIMIT_BYTES, 8192);
});

test('support filters enforce bounded search, page, records, and public statuses', () => {
  const filters = normalizeCustomerSupportFilters({
    page: '999999',
    q: `  ${'x'.repeat(200)}  `,
    status: 'INTERNAL_REVIEW',
  });
  assert.equal(CUSTOMER_SUPPORT_PAGE_SIZE, 20);
  assert.equal(CUSTOMER_SUPPORT_ABSOLUTE_RECORD_LIMIT, 500);
  assert.equal(CUSTOMER_SUPPORT_MAX_PAGE, 25);
  assert.equal(filters.page, 25);
  assert.equal(filters.query.length, 80);
  assert.equal(filters.status, 'ALL');
  assert.equal(customerSupportPublicStatusLabel('OPEN'), 'Open');
  assert.equal(customerSupportPublicStatusLabel('SECRET'), 'Under review');
  assert.equal(customerSupportCategoryLabel('PAYMENT'), 'Payment');
});

test('change and cancellation intents are transport-owned and human-review only', () => {
  assert.equal(
    isTransportServicingIntentAllowed({
      category: 'BOOKING',
      hasBookingReference: true,
      intent: 'CHANGE_REQUEST',
      productType: 'FLIGHT',
    }),
    true,
  );
  assert.equal(
    isTransportServicingIntentAllowed({
      category: 'BOOKING',
      hasBookingReference: true,
      intent: 'CANCELLATION_REQUEST',
      productType: null,
    }),
    false,
  );
  assert.equal(
    customerServicingSubject({
      intent: 'CHANGE_REQUEST',
      productType: 'BUS',
      subject: 'Please move my journey',
    }),
    'bus change request: Please move my journey',
  );
  assert.match(componentSource, /human-reviewed request/);
  assert.match(componentSource, /does not automatically change or cancel/);
  assert.doesNotMatch(
    serviceSource,
    /paymentTransaction\.update|refundRequest\.update|booking\.update/,
  );
});

test('support creation resolves and claims ownership inside one transaction', () => {
  assert.match(serviceSource, /prisma\.\$transaction\(async \(transaction\)/);
  assert.match(serviceSource, /transaction\.customerTrip\.findUnique/);
  assert.match(serviceSource, /transaction\.booking\.findUnique/);
  assert.match(serviceSource, /trip\?\.userId === input\.userId/);
  assert.match(serviceSource, /trip\?\.userId === null/);
  assert.match(serviceSource, /normalizeEmail\(trip\.email\) === normalizedEmail/);
  assert.match(serviceSource, /transaction\.customerTrip\.updateMany/);
  assert.match(serviceSource, /where: \{ id: trip\.id, userId: null \}/);
  assert.match(serviceSource, /transaction\.customerSupportCase\.create/);
  assert.match(serviceSource, /transaction\.customerSupportCaseEvent\.create/);
});

test('customer list is a minimal owned projection with deterministic bounded pagination', () => {
  assert.match(serviceSource, /userId,/);
  assert.match(
    serviceSource,
    /status: status === 'ALL' \? \{ in: \['CLOSED', 'OPEN'\] \} : status/,
  );
  assert.match(serviceSource, /orderBy: \[\{ updatedAt: 'desc' \}, \{ id: 'desc' \}\]/);
  assert.match(serviceSource, /take: CUSTOMER_SUPPORT_PAGE_SIZE/);
  assert.match(serviceSource, /Math\.min\(matchingCount, CUSTOMER_SUPPORT_ABSOLUTE_RECORD_LIMIT\)/);
  assert.doesNotMatch(serviceSource, /reviewedByUserId:\s*true|events:\s*true|actorUserId:\s*true/);
  assert.doesNotMatch(pageSource, /reviewedByUserId|actorUserId|event\.summary/);
});

test('support mutation preserves origin checks, authentication, body cap, and rate limit', () => {
  const sameOrigin = new Request('https://mandyal.test/api/v1/account/support', {
    headers: { origin: 'https://mandyal.test' },
    method: 'POST',
  });
  const missingOrigin = new Request('https://mandyal.test/api/v1/account/support', {
    method: 'POST',
  });
  const fetchMetadata = new Request('https://mandyal.test/api/v1/account/support', {
    headers: { 'sec-fetch-site': 'same-origin' },
    method: 'POST',
  });
  assert.equal(isDirectSameOriginSupportMutation(sameOrigin), true);
  assert.equal(isDirectSameOriginSupportMutation(missingOrigin), false);
  assert.equal(isDirectSameOriginSupportMutation(fetchMetadata), true);
  assert.match(routeSource, /getCurrentUser\(\)/);
  assert.match(routeSource, /readJsonObject\(request, CUSTOMER_SUPPORT_BODY_LIMIT_BYTES\)/);
  assert.match(routeSource, /consumeRateLimit/);
  assert.match(routeSource, /isDirectSameOriginSupportMutation\(request\)/);
});

test('customer UI keeps timeline navigation and accessible operational states', () => {
  assert.match(componentSource, /View case timeline/);
  assert.match(componentSource, /role="status"/);
  assert.match(componentSource, /role="alert"/);
  assert.match(pageSource, /role="search"/);
  assert.match(pageSource, /aria-label="Customer support case pages"/);
});
