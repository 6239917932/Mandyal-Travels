import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('payment-mode operations are partner scoped and preserve append-only reversals', async () => {
  const service = await read('services/partnerPaymentModeOperationsService.ts');
  assert.match(service, /listingSource: 'MANAGED', partnerId/);
  assert.match(service, /booking: \{ hotelSlug: \{ in: hotelSlugs \} \}/);
  assert.match(service, /HOTEL_FOLIO_PAYMENT_CATEGORIES/);
  assert.match(service, /entry\.entryType === 'REVERSAL' \? -entry\.amount : entry\.amount/);
  assert.match(service, /hotelCashierShift\.findMany/);
  assert.doesNotMatch(service, /\.(?:create|update|delete|upsert)\(/);
});

test('online payment posture displays stored provider and reconciliation evidence only', async () => {
  const service = await read('services/partnerPaymentModeOperationsService.ts');
  const page = await read('app/partner/pms/payment-modes/page.tsx');
  assert.match(service, /paymentTransaction\.findMany/);
  assert.match(service, /payment\.status\.toUpperCase\(\) === 'CAPTURED'/);
  assert.match(service, /providerAcknowledgementRecorded/);
  assert.match(service, /reconciliationStatus: payment\.reconciliationStatus/);
  assert.match(page, /Reconciliation is shown separately and is never inferred/);
  assert.match(page, /at-property record only/);
  assert.doesNotMatch(page, /reconciled successfully|provider approved|settlement complete/i);
});

test('multiple payment modes page is protected and links existing finance workspaces', async () => {
  const page = await read('app/partner/pms/payment-modes/page.tsx');
  assert.match(page, /getPartnerAccess/);
  assert.match(page, /getPartnerPaymentModeOperations/);
  assert.match(page, /href="\/partner\/pms\/billing"/);
  assert.match(page, /href="\/partner\/pms\/split-billing"/);
  for (const mode of ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER']) {
    assert.match(page, new RegExp(mode));
  }
});
