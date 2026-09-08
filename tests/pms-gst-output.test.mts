import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('GST preparation reuses immutable tax snapshots and enforces partner-owned properties', () => {
  const schema = read('prisma/schema.prisma');
  const service = read('services/partnerHotelReportingService.ts');
  assert.match(schema, /model MarketplaceTaxSnapshot/);
  assert.doesNotMatch(schema, /model (Hotel)?GstInvoice/);
  assert.match(service, /taxSnapshot: \{ is: \{ partnerId: input\.partnerId \} \}/);
  assert.match(service, /hotelSlug: \{ in: hotelSlugs \}/);
  assert.match(service, /where: \{ listingSource: 'MANAGED', partnerId, status: 'ACTIVE' \}/);
  assert.match(service, /statutoryIssuanceEnabled: false/);
  assert.match(service, /supplementalChargeAmount:[\s\S]*netSupplementalCharges/);
  assert.match(service, /supplementalCurrencyConflict/);
});

test('GST UI cannot be mistaken for a statutory invoice', () => {
  const workspace = read('app/partner/pms/gst-billing/page.tsx');
  const statement = read('app/partner/pms/gst-billing/[confirmationCode]/page.tsx');
  assert.match(workspace, /Statutory GST invoice issuance is not enabled/);
  assert.match(workspace, /tax-adviser approval/i);
  assert.match(statement, /NOT A TAX INVOICE/);
  assert.match(statement, /no statutory invoice number/);
  assert.match(statement, /PrintDocumentButton/);
  assert.match(statement, /Supplemental folio charges/);
  assert.doesNotMatch(statement, /invoiceNumber|invoiceSerial|CGST amount|SGST amount|IGST amount/);
});

test('PMS module registry exposes the controlled GST and report workspaces as live', () => {
  const registry = read('lib/pms/moduleRegistry.ts');
  assert.match(
    registry,
    /code: 'GT'[\s\S]*href: '\/partner\/pms\/gst-billing'[\s\S]*status: 'LIVE'/,
  );
  assert.match(registry, /code: 'RP'[\s\S]*href: '\/partner\/pms\/reports'[\s\S]*status: 'LIVE'/);
});
