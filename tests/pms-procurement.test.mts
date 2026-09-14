import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  nextPurchaseOrderStatus,
  normalizeGoodsReceipt,
  normalizePurchaseOrder,
  normalizePurchaseOrderAction,
  procurementRequestFingerprint,
} from '../lib/pms/procurement.ts';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('purchase orders normalize bounded multi-line INR values and estimated tax', () => {
  assert.deepEqual(
    normalizePurchaseOrder({
      expectedDeliveryDate: '2026-09-18',
      lines: [
        { quantityOrdered: 5, stockItemId: 'linen-1', taxRatePercent: '18', unitPrice: '100.50' },
        { quantityOrdered: 2, stockItemId: 'soap-1', taxRatePercent: '5', unitPrice: '25' },
      ],
      note: 'Approved housekeeping replenishment',
      orderDate: '2026-09-14',
      propertyId: 'property-1',
      purchaseOrderNumber: ' po/26/001 ',
      vendorId: 'vendor-1',
    }),
    {
      expectedDeliveryDate: '2026-09-18',
      lines: [
        {
          lineSubtotalMinor: 50250,
          lineTaxMinor: 9045,
          lineTotalMinor: 59295,
          quantityOrdered: 5,
          stockItemId: 'linen-1',
          taxRateBasisPoints: 1800,
          unitPriceMinor: 10050,
        },
        {
          lineSubtotalMinor: 5000,
          lineTaxMinor: 250,
          lineTotalMinor: 5250,
          quantityOrdered: 2,
          stockItemId: 'soap-1',
          taxRateBasisPoints: 500,
          unitPriceMinor: 2500,
        },
      ],
      note: 'Approved housekeeping replenishment',
      orderDate: '2026-09-14',
      propertyId: 'property-1',
      purchaseOrderNumber: 'PO/26/001',
      subtotalMinor: 55250,
      taxMinor: 9295,
      totalMinor: 64545,
      vendorId: 'vendor-1',
    },
  );
  assert.equal(normalizePurchaseOrder({}), null);
  assert.equal(
    normalizePurchaseOrder({
      expectedDeliveryDate: '2026-09-13',
      lines: [{}],
      orderDate: '2026-09-14',
    }),
    null,
  );
  assert.equal(
    normalizePurchaseOrder({
      expectedDeliveryDate: '2026-09-18',
      lines: [
        { quantityOrdered: 1, stockItemId: 'same', taxRatePercent: 0, unitPrice: 1 },
        { quantityOrdered: 1, stockItemId: 'same', taxRatePercent: 0, unitPrice: 1 },
      ],
      orderDate: '2026-09-14',
      propertyId: 'p',
      purchaseOrderNumber: 'PO-1',
      vendorId: 'v',
    }),
    null,
  );
});

test('approval lifecycle and partial receipt inputs are explicit and versioned', () => {
  assert.equal(nextPurchaseOrderStatus('DRAFT', 'SUBMIT'), 'SUBMITTED');
  assert.equal(nextPurchaseOrderStatus('SUBMITTED', 'APPROVE'), 'APPROVED');
  assert.equal(nextPurchaseOrderStatus('APPROVED', 'CANCEL'), null);
  assert.deepEqual(
    normalizePurchaseOrderAction({
      action: 'approve',
      expectedVersion: 2,
      note: 'Budget owner approved.',
      purchaseOrderId: 'po-1',
    }),
    {
      action: 'APPROVE',
      expectedVersion: 2,
      note: 'Budget owner approved.',
      purchaseOrderId: 'po-1',
    },
  );
  assert.deepEqual(
    normalizeGoodsReceipt({
      deliveryReference: 'INV-200',
      expectedOrderVersion: 3,
      expectedStockVersion: 4,
      note: 'Counted and accepted intact.',
      purchaseOrderLineId: 'line-1',
      quantity: 2,
      receivedOn: '2026-09-14',
    }),
    {
      deliveryReference: 'INV-200',
      expectedOrderVersion: 3,
      expectedStockVersion: 4,
      note: 'Counted and accepted intact.',
      purchaseOrderLineId: 'line-1',
      quantity: 2,
      receivedOn: '2026-09-14',
    },
  );
  assert.equal(procurementRequestFingerprint({ id: 1 }), procurementRequestFingerprint({ id: 1 }));
});

test('procurement persistence is scoped, immutable, retry safe, and stock-linked', async () => {
  const [
    schema,
    postgres,
    sqliteMigration,
    postgresMigration,
    service,
    createRoute,
    eventRoute,
    receiptRoute,
  ] = await Promise.all([
    read('prisma/schema.prisma'),
    read('prisma/postgresql/schema.prisma'),
    read('prisma/migrations/20260914220000_add_purchase_order_controls/migration.sql'),
    read('prisma/postgresql/migrations/20260914220000_add_purchase_order_controls/migration.sql'),
    read('services/partnerProcurementService.ts'),
    read('app/api/v1/partner/purchase-orders/route.ts'),
    read('app/api/v1/partner/purchase-order-events/route.ts'),
    read('app/api/v1/partner/goods-receipts/route.ts'),
  ]);
  for (const contract of [schema, postgres]) {
    assert.match(
      contract,
      /model HotelPurchaseOrder[\s\S]*@@unique\(\[propertyId, purchaseOrderNumber\]\)/,
    );
    assert.match(contract, /model HotelGoodsReceipt[\s\S]*stockMovementId\s+String\s+@unique/);
  }
  for (const migration of [sqliteMigration, postgresMigration]) {
    assert.match(migration, /HotelPurchaseOrder_propertyId_purchaseOrderNumber_key/);
    assert.match(migration, /HotelGoodsReceipt_stockMovementId_key/);
  }
  assert.match(service, /listingSource: 'MANAGED'[\s\S]*partnerId: input\.partnerId/);
  assert.match(service, /RECEIPT_EXCEEDS_ORDER/);
  assert.match(service, /hotelStockItem\.updateMany/);
  assert.match(service, /hotelStockMovement\.create/);
  assert.match(service, /requestFingerprint !== fingerprint/);
  for (const route of [createRoute, eventRoute, receiptRoute]) {
    assert.match(route, /isSameOriginMutation/);
    assert.match(route, /recordPartnerAudit/);
  }
});

test('the procurement workspace exposes approvals and partial receipt matching without payment claims', async () => {
  const page = await read('app/partner/pms/procurement/page.tsx');
  assert.match(page, /PurchaseOrderForm/);
  assert.match(page, /PurchaseOrderActionForm/);
  assert.match(page, /GoodsReceiptForm/);
  assert.match(page, /supplier payment release remain separate/);
});
