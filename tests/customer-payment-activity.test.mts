import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CUSTOMER_PAYMENT_MAX_PAGES,
  CUSTOMER_PAYMENT_MAX_RESULTS,
  CUSTOMER_PAYMENT_PAGE_SIZE,
  CUSTOMER_PAYMENT_REFUNDS_PER_PAYMENT,
  customerHotelBookingStatus,
  customerPaymentStatus,
  customerRefundStatus,
  normalizeCustomerPaymentPage,
} from '../services/customerPaymentActivityRules.ts';

test('customer payment paging is closed and bounded', () => {
  assert.equal(CUSTOMER_PAYMENT_PAGE_SIZE, 15);
  assert.equal(CUSTOMER_PAYMENT_MAX_PAGES, 20);
  assert.equal(CUSTOMER_PAYMENT_MAX_RESULTS, 300);
  assert.equal(CUSTOMER_PAYMENT_REFUNDS_PER_PAYMENT, 5);
  assert.equal(normalizeCustomerPaymentPage(undefined), 1);
  assert.equal(normalizeCustomerPaymentPage('-4'), 1);
  assert.equal(normalizeCustomerPaymentPage('2.5'), 1);
  assert.equal(normalizeCustomerPaymentPage('999'), 20);
  assert.equal(normalizeCustomerPaymentPage(['3', '8']), 3);
});

test('unknown internal payment and refund states fail closed for customers', () => {
  assert.equal(customerHotelBookingStatus('confirmed'), 'CONFIRMED');
  assert.equal(customerHotelBookingStatus('private-booking-state'), 'UNDER_REVIEW');
  assert.equal(customerPaymentStatus('captured'), 'PAID');
  assert.equal(customerPaymentStatus('failed'), 'UNSUCCESSFUL');
  assert.equal(customerPaymentStatus('gateway-internal-state'), 'UNDER_REVIEW');
  assert.equal(customerRefundStatus('APPROVED'), 'COMPLETED');
  assert.equal(customerRefundStatus('PROVIDER_FAILED'), 'DELAYED');
  assert.equal(customerRefundStatus('private-state'), 'UNDER_REVIEW');
});

test('payment activity enforces normalized exact guest ownership and bounded relations', () => {
  const service = readFileSync('services/customerPaymentActivityService.ts', 'utf8');
  assert.match(service, /normalizeEmail\(sessionEmail\)/);
  assert.match(service, /LOWER\(TRIM\(guest\."email"\)\) = \$\{email\}/);
  assert.match(service, /LIMIT \$\{CUSTOMER_PAYMENT_MAX_RESULTS \+ 1\}/);
  assert.match(service, /take: CUSTOMER_PAYMENT_REFUNDS_PER_PAYMENT/);
  assert.match(service, /select:\s*\{[\s\S]*confirmationCode: true/);
  for (const privateField of [
    'checkoutIntentId: true',
    'provider: true',
    'providerRef: true',
    'providerRefundRef: true',
    'reconciliationNote: true',
    'reviewNote: true',
    'ledgerEntries: true',
    'journals: true',
  ]) {
    assert.ok(!service.includes(privateField), `${privateField} must remain private`);
  }
});

test('customer payments API is authenticated GET-only and exposes no mutation', () => {
  const route = readFileSync('app/api/v1/account/payments/route.ts', 'utf8');
  assert.match(route, /export async function GET/);
  assert.match(route, /getCurrentUser\(\)/);
  assert.match(route, /AUTH_REQUIRED/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);

  const page = readFileSync('app/account/payments/page.tsx', 'utf8');
  assert.match(page, /read-only history for hotel bookings/);
  assert.match(page, /cannot capture a payment, start or approve a/);
  assert.match(page, /Flight, bus,[\s\S]*car payment records are not connected/);
  assert.match(page, /aria-label="Hotel payment activity pages"/);
});
