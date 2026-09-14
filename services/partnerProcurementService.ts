import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  nextPurchaseOrderStatus,
  normalizeGoodsReceipt,
  normalizePurchaseOrder,
  normalizePurchaseOrderAction,
  procurementRequestFingerprint,
} from '@/lib/pms/procurement';

const MAX_ORDERS = 300;
const MAX_RECEIPTS = 500;

export class PartnerProcurementError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function getPartnerProcurementWorkspace(partnerId: string) {
  const [properties, vendors, items, orders, receipts, stockMovements] = await Promise.all([
    prisma.partnerProperty.findMany({
      orderBy: { displayName: 'asc' },
      select: { displayName: true, id: true },
      take: 101,
      where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelVendor.findMany({
      orderBy: { legalName: 'asc' },
      select: { id: true, legalName: true, propertyId: true, vendorCode: true },
      take: 501,
      where: { partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelStockItem.findMany({
      include: { property: { select: { displayName: true } } },
      orderBy: { name: 'asc' },
      take: 501,
      where: { partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelPurchaseOrder.findMany({
      include: {
        lines: {
          include: { stockItem: { select: { name: true, sku: true, unit: true, version: true } } },
        },
        property: { select: { displayName: true } },
        vendor: { select: { legalName: true, vendorCode: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: MAX_ORDERS + 1,
      where: { partnerId },
    }),
    prisma.hotelGoodsReceipt.findMany({
      include: {
        purchaseOrder: { select: { purchaseOrderNumber: true } },
        stockItem: { select: { name: true, sku: true, unit: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_RECEIPTS + 1,
      where: { partnerId },
    }),
    prisma.hotelStockMovement.findMany({
      include: {
        item: { select: { name: true, sku: true, unit: true } },
        property: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 501,
      where: { movementType: 'RECEIPT', partnerId },
    }),
  ]);
  return {
    items: items.slice(0, 500),
    orders: orders.slice(0, MAX_ORDERS),
    properties: properties.slice(0, 100),
    receipts: receipts.slice(0, MAX_RECEIPTS),
    safetyLimitReached:
      properties.length > 100 ||
      vendors.length > 500 ||
      items.length > 500 ||
      orders.length > MAX_ORDERS ||
      receipts.length > MAX_RECEIPTS ||
      stockMovements.length > 500,
    stockMovements: stockMovements.slice(0, 500),
    vendors: vendors.slice(0, 500),
  } as const;
}

export async function createPartnerPurchaseOrder(input: {
  actorUserId: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizePurchaseOrder(input.values);
  if (!values)
    throw new PartnerProcurementError(
      'INVALID_PURCHASE_ORDER',
      'Enter valid purchase-order details and line values.',
    );
  const [property, vendor, itemCount] = await Promise.all([
    prisma.partnerProperty.findFirst({
      select: { id: true },
      where: {
        id: values.propertyId,
        listingSource: 'MANAGED',
        partnerId: input.partnerId,
        status: 'ACTIVE',
      },
    }),
    prisma.hotelVendor.findFirst({
      select: { id: true },
      where: {
        id: values.vendorId,
        partnerId: input.partnerId,
        propertyId: values.propertyId,
        status: 'ACTIVE',
      },
    }),
    prisma.hotelStockItem.count({
      where: {
        id: { in: values.lines.map((line) => line.stockItemId) },
        partnerId: input.partnerId,
        propertyId: values.propertyId,
        status: 'ACTIVE',
      },
    }),
  ]);
  if (!property)
    throw new PartnerProcurementError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
  if (!vendor)
    throw new PartnerProcurementError(
      'VENDOR_NOT_FOUND',
      'Select an active vendor for this property.',
    );
  if (itemCount !== values.lines.length)
    throw new PartnerProcurementError(
      'STOCK_ITEM_NOT_FOUND',
      'Every order line must use an active stock item from this property.',
    );
  try {
    return await prisma.$transaction(async (transaction) => {
      const order = await transaction.hotelPurchaseOrder.create({
        data: {
          createdByUserId: input.actorUserId,
          currency: 'INR',
          expectedDeliveryDate: values.expectedDeliveryDate,
          lines: { create: values.lines },
          note: values.note,
          orderDate: values.orderDate,
          partnerId: input.partnerId,
          propertyId: values.propertyId,
          purchaseOrderNumber: values.purchaseOrderNumber,
          subtotalMinor: values.subtotalMinor,
          taxMinor: values.taxMinor,
          totalMinor: values.totalMinor,
          vendorId: values.vendorId,
        },
      });
      const event = {
        fromStatus: 'NONE',
        note: 'Purchase order created as a draft.',
        purchaseOrderId: order.id,
        toStatus: 'DRAFT',
        version: 1,
      };
      await transaction.hotelPurchaseOrderEvent.create({
        data: {
          ...event,
          action: 'CREATED',
          actorUserId: input.actorUserId,
          idempotencyKey: `purchase-order-opening-${order.id}`,
          partnerId: input.partnerId,
          propertyId: values.propertyId,
          requestFingerprint: procurementRequestFingerprint(event),
        },
      });
      return order;
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002')
      throw new PartnerProcurementError(
        'PURCHASE_ORDER_EXISTS',
        'This property already uses that purchase-order number.',
      );
    throw error;
  }
}

export async function transitionPartnerPurchaseOrder(input: {
  actorIsAdmin: boolean;
  actorUserId: string;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizePurchaseOrderAction(input.values);
  const idempotencyKey = input.idempotencyKey.trim();
  if (!values || idempotencyKey.length < 16 || idempotencyKey.length > 120)
    throw new PartnerProcurementError(
      'INVALID_PURCHASE_ORDER_ACTION',
      'Enter a valid action, reason, and retry key.',
    );
  if (values.action === 'APPROVE' && !input.actorIsAdmin)
    throw new PartnerProcurementError(
      'APPROVAL_REQUIRED',
      'Only a supplier administrator can approve a purchase order.',
    );
  const fingerprint = procurementRequestFingerprint({ partnerId: input.partnerId, ...values });
  return prisma.$transaction(async (transaction) => {
    const replay = await transaction.hotelPurchaseOrderEvent.findUnique({
      where: { idempotencyKey },
    });
    if (replay) {
      if (replay.partnerId !== input.partnerId || replay.requestFingerprint !== fingerprint)
        throw new PartnerProcurementError(
          'IDEMPOTENCY_CONFLICT',
          'That retry key belongs to another purchase-order action.',
        );
      return replay;
    }
    const order = await transaction.hotelPurchaseOrder.findFirst({
      where: { id: values.purchaseOrderId, partnerId: input.partnerId },
    });
    if (!order)
      throw new PartnerProcurementError(
        'PURCHASE_ORDER_NOT_FOUND',
        'The purchase order was not found.',
      );
    const nextStatus = nextPurchaseOrderStatus(order.status, values.action);
    if (!nextStatus)
      throw new PartnerProcurementError(
        'INVALID_STATUS_CHANGE',
        `A ${order.status.toLowerCase()} order cannot be ${values.action.toLowerCase()}ed.`,
      );
    const now = new Date();
    const updated = await transaction.hotelPurchaseOrder.updateMany({
      data: {
        ...(values.action === 'SUBMIT' ? { submittedAt: now } : {}),
        ...(values.action === 'APPROVE'
          ? { approvedAt: now, approvedByUserId: input.actorUserId }
          : {}),
        ...(values.action === 'CANCEL' ? { cancelledAt: now } : {}),
        status: nextStatus,
        version: { increment: 1 },
      },
      where: { id: order.id, partnerId: input.partnerId, version: values.expectedVersion },
    });
    if (updated.count !== 1)
      throw new PartnerProcurementError(
        'STALE_PURCHASE_ORDER',
        'The purchase order changed after this page loaded. Refresh and retry.',
      );
    return transaction.hotelPurchaseOrderEvent.create({
      data: {
        action: values.action,
        actorUserId: input.actorUserId,
        fromStatus: order.status,
        idempotencyKey,
        note: values.note,
        partnerId: input.partnerId,
        propertyId: order.propertyId,
        purchaseOrderId: order.id,
        requestFingerprint: fingerprint,
        toStatus: nextStatus,
        version: order.version + 1,
      },
    });
  });
}

export async function receivePartnerPurchaseOrderLine(input: {
  actorUserId: string;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeGoodsReceipt(input.values);
  const idempotencyKey = input.idempotencyKey.trim();
  if (!values || idempotencyKey.length < 16 || idempotencyKey.length > 120)
    throw new PartnerProcurementError(
      'INVALID_GOODS_RECEIPT',
      'Enter a valid receipt, delivery reference, reason, and retry key.',
    );
  const fingerprint = procurementRequestFingerprint({ partnerId: input.partnerId, ...values });
  return prisma.$transaction(async (transaction) => {
    const replay = await transaction.hotelGoodsReceipt.findUnique({ where: { idempotencyKey } });
    if (replay) {
      if (replay.partnerId !== input.partnerId || replay.requestFingerprint !== fingerprint)
        throw new PartnerProcurementError(
          'IDEMPOTENCY_CONFLICT',
          'That retry key belongs to another goods receipt.',
        );
      return replay;
    }
    const line = await transaction.hotelPurchaseOrderLine.findFirst({
      include: { purchaseOrder: true, stockItem: true },
      where: { id: values.purchaseOrderLineId, purchaseOrder: { partnerId: input.partnerId } },
    });
    if (!line)
      throw new PartnerProcurementError(
        'PURCHASE_ORDER_LINE_NOT_FOUND',
        'The purchase-order line was not found.',
      );
    if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(line.purchaseOrder.status))
      throw new PartnerProcurementError(
        'PURCHASE_ORDER_NOT_APPROVED',
        'Approve the purchase order before receiving goods.',
      );
    if (line.quantityReceived + values.quantity > line.quantityOrdered)
      throw new PartnerProcurementError(
        'RECEIPT_EXCEEDS_ORDER',
        'The receipt quantity exceeds the outstanding order quantity.',
      );
    const resultingQuantity = line.stockItem.quantityOnHand + values.quantity;
    const stockUpdated = await transaction.hotelStockItem.updateMany({
      data: { quantityOnHand: resultingQuantity, version: { increment: 1 } },
      where: {
        id: line.stockItemId,
        partnerId: input.partnerId,
        status: 'ACTIVE',
        version: values.expectedStockVersion,
      },
    });
    if (stockUpdated.count !== 1)
      throw new PartnerProcurementError(
        'STALE_STOCK_ITEM',
        'Stock changed after this page loaded. Refresh and retry.',
      );
    const lineUpdated = await transaction.hotelPurchaseOrderLine.updateMany({
      data: { quantityReceived: { increment: values.quantity } },
      where: { id: line.id, quantityReceived: line.quantityReceived },
    });
    if (lineUpdated.count !== 1)
      throw new PartnerProcurementError(
        'STALE_PURCHASE_ORDER_LINE',
        'The order line changed after this page loaded. Refresh and retry.',
      );
    const otherLines = await transaction.hotelPurchaseOrderLine.findMany({
      select: { quantityOrdered: true, quantityReceived: true },
      where: { purchaseOrderId: line.purchaseOrderId, id: { not: line.id } },
    });
    const otherOutstanding = otherLines.some(
      (otherLine) => otherLine.quantityReceived < otherLine.quantityOrdered,
    );
    const lineComplete = line.quantityReceived + values.quantity === line.quantityOrdered;
    const nextStatus = lineComplete && !otherOutstanding ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    const orderUpdated = await transaction.hotelPurchaseOrder.updateMany({
      data: { status: nextStatus, version: { increment: 1 } },
      where: {
        id: line.purchaseOrderId,
        partnerId: input.partnerId,
        version: values.expectedOrderVersion,
      },
    });
    if (orderUpdated.count !== 1)
      throw new PartnerProcurementError(
        'STALE_PURCHASE_ORDER',
        'The purchase order changed after this page loaded. Refresh and retry.',
      );
    const movement = await transaction.hotelStockMovement.create({
      data: {
        actorUserId: input.actorUserId,
        idempotencyKey: `po-stock-${idempotencyKey}`,
        itemId: line.stockItemId,
        movementType: 'RECEIPT',
        note: `PO ${line.purchaseOrder.purchaseOrderNumber} · ${values.deliveryReference} · ${values.note}`,
        partnerId: input.partnerId,
        propertyId: line.purchaseOrder.propertyId,
        quantity: values.quantity,
        requestFingerprint: fingerprint,
        resultingQuantity,
      },
    });
    const receipt = await transaction.hotelGoodsReceipt.create({
      data: {
        actorUserId: input.actorUserId,
        deliveryReference: values.deliveryReference,
        idempotencyKey,
        note: values.note,
        partnerId: input.partnerId,
        propertyId: line.purchaseOrder.propertyId,
        purchaseOrderId: line.purchaseOrderId,
        purchaseOrderLineId: line.id,
        quantity: values.quantity,
        receivedOn: values.receivedOn,
        requestFingerprint: fingerprint,
        stockItemId: line.stockItemId,
        stockMovementId: movement.id,
      },
    });
    await transaction.hotelPurchaseOrderEvent.create({
      data: {
        action: 'GOODS_RECEIVED',
        actorUserId: input.actorUserId,
        fromStatus: line.purchaseOrder.status,
        idempotencyKey: `po-event-${idempotencyKey}`,
        note: `${values.quantity} ${line.stockItem.unit} received against ${values.deliveryReference}.`,
        partnerId: input.partnerId,
        propertyId: line.purchaseOrder.propertyId,
        purchaseOrderId: line.purchaseOrderId,
        requestFingerprint: fingerprint,
        toStatus: nextStatus,
        version: line.purchaseOrder.version + 1,
      },
    });
    return receipt;
  });
}
