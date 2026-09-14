import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  normalizeStockItem,
  normalizeStockLocation,
  normalizeStockLotReceipt,
  normalizeStockLotTransfer,
  normalizeStockMovement,
  normalizeStockWastage,
  normalizeStockWastageReversal,
  stockMovementDelta,
  stockRequestFingerprint,
} from '@/lib/pms/stockInventory';

const MAX_ITEMS = 500;
const MAX_MOVEMENTS = 500;

export class PartnerStockInventoryError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function getPartnerStockInventory(partnerId: string) {
  const [properties, items, movements, locations, lots, lotEvents] = await Promise.all([
    prisma.partnerProperty.findMany({
      orderBy: { displayName: 'asc' },
      select: { displayName: true, id: true },
      take: 100,
      where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelStockItem.findMany({
      include: { property: { select: { displayName: true } } },
      orderBy: [{ updatedAt: 'desc' }],
      take: MAX_ITEMS + 1,
      where: { partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelStockMovement.findMany({
      include: {
        item: { select: { name: true, sku: true, unit: true } },
        property: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_MOVEMENTS + 1,
      where: { partnerId },
    }),
    prisma.hotelStockLocation.findMany({
      include: { property: { select: { displayName: true } } },
      orderBy: [{ property: { displayName: 'asc' } }, { name: 'asc' }],
      take: 501,
      where: { partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelStockLot.findMany({
      include: {
        item: { select: { name: true, sku: true, unit: true, version: true } },
        location: { select: { name: true } },
        property: { select: { displayName: true } },
      },
      orderBy: [{ expiryDate: 'asc' }, { updatedAt: 'desc' }],
      take: 501,
      where: { partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelStockLotEvent.findMany({
      include: {
        fromLocation: { select: { name: true } },
        fromLot: { select: { lotCode: true, version: true } },
        item: { select: { name: true, sku: true, unit: true, version: true } },
        reversedBy: { select: { id: true } },
        toLocation: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 501,
      where: { partnerId },
    }),
  ]);
  return {
    items: items.slice(0, MAX_ITEMS),
    locations: locations.slice(0, MAX_ITEMS),
    lotEvents: lotEvents.slice(0, MAX_MOVEMENTS),
    lots: lots.slice(0, MAX_ITEMS),
    movements: movements.slice(0, MAX_MOVEMENTS),
    properties,
    safetyLimitReached:
      items.length > MAX_ITEMS ||
      movements.length > MAX_MOVEMENTS ||
      locations.length > MAX_ITEMS ||
      lots.length > MAX_ITEMS ||
      lotEvents.length > MAX_MOVEMENTS,
  } as const;
}

export async function createPartnerStockLocation(input: {
  actorUserId: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeStockLocation(input.values);
  if (!values)
    throw new PartnerStockInventoryError(
      'INVALID_STOCK_LOCATION',
      'Enter a valid property, store code, name, and type.',
    );
  const property = await prisma.partnerProperty.findFirst({
    select: { id: true },
    where: {
      id: values.propertyId,
      listingSource: 'MANAGED',
      partnerId: input.partnerId,
      status: 'ACTIVE',
    },
  });
  if (!property)
    throw new PartnerStockInventoryError(
      'PROPERTY_NOT_FOUND',
      'The managed property was not found.',
    );
  try {
    return await prisma.hotelStockLocation.create({
      data: { ...values, partnerId: input.partnerId },
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002')
      throw new PartnerStockInventoryError(
        'LOCATION_EXISTS',
        'That store code already exists for this property.',
      );
    throw error;
  }
}

type StockLotAction = 'RECEIPT' | 'TRANSFER' | 'WASTAGE' | 'WASTAGE_REVERSAL';

export async function recordPartnerStockLotAction(input: {
  actorUserId: string;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const action = String(input.values.action ?? '')
    .trim()
    .toUpperCase() as StockLotAction;
  const values =
    action === 'RECEIPT'
      ? normalizeStockLotReceipt(input.values)
      : action === 'TRANSFER'
        ? normalizeStockLotTransfer(input.values)
        : action === 'WASTAGE'
          ? normalizeStockWastage(input.values)
          : action === 'WASTAGE_REVERSAL'
            ? normalizeStockWastageReversal(input.values)
            : null;
  if (!values || input.idempotencyKey.trim().length < 16 || input.idempotencyKey.length > 120) {
    throw new PartnerStockInventoryError(
      'INVALID_STOCK_LOT_ACTION',
      'Enter valid batch-control details and retry key.',
    );
  }
  const fingerprint = stockRequestFingerprint({ partnerId: input.partnerId, ...values });
  return prisma.$transaction(async (transaction) => {
    const replay = await transaction.hotelStockLotEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (replay) {
      if (replay.partnerId !== input.partnerId || replay.requestFingerprint !== fingerprint)
        throw new PartnerStockInventoryError(
          'IDEMPOTENCY_CONFLICT',
          'That retry key belongs to another batch-control action.',
        );
      return replay;
    }

    if (values.eventType === 'RECEIPT') {
      const [item, location] = await Promise.all([
        transaction.hotelStockItem.findFirst({
          where: { id: values.itemId, partnerId: input.partnerId, status: 'ACTIVE' },
        }),
        transaction.hotelStockLocation.findFirst({
          where: { id: values.locationId, partnerId: input.partnerId, status: 'ACTIVE' },
        }),
      ]);
      if (!item || !location || item.propertyId !== location.propertyId)
        throw new PartnerStockInventoryError(
          'STOCK_SCOPE_MISMATCH',
          'The item and store must belong to the same managed property.',
        );
      const existingLot = await transaction.hotelStockLot.findUnique({
        where: {
          itemId_locationId_lotCode: {
            itemId: item.id,
            locationId: location.id,
            lotCode: values.lotCode,
          },
        },
      });
      if (existingLot && existingLot.expiryDate !== values.expiryDate)
        throw new PartnerStockInventoryError(
          'LOT_EXPIRY_CONFLICT',
          'That batch code already has a different expiry date in this store.',
        );
      const updated = await transaction.hotelStockItem.updateMany({
        data: { quantityOnHand: { increment: values.quantity }, version: { increment: 1 } },
        where: { id: item.id, partnerId: input.partnerId, version: values.expectedItemVersion },
      });
      if (updated.count !== 1)
        throw new PartnerStockInventoryError(
          'STALE_STOCK_ITEM',
          'Stock changed after this page loaded. Refresh and retry.',
        );
      const lot = await transaction.hotelStockLot.upsert({
        create: {
          expiryDate: values.expiryDate,
          itemId: item.id,
          locationId: location.id,
          lotCode: values.lotCode,
          partnerId: input.partnerId,
          propertyId: item.propertyId,
          quantityOnHand: values.quantity,
        },
        update: { quantityOnHand: { increment: values.quantity }, version: { increment: 1 } },
        where: {
          itemId_locationId_lotCode: {
            itemId: item.id,
            locationId: location.id,
            lotCode: values.lotCode,
          },
        },
      });
      const resultingQuantity = item.quantityOnHand + values.quantity;
      await transaction.hotelStockMovement.create({
        data: {
          actorUserId: input.actorUserId,
          idempotencyKey: `lot-${input.idempotencyKey}`,
          itemId: item.id,
          movementType: 'RECEIPT',
          note: `${values.note} · batch ${values.lotCode}`,
          partnerId: input.partnerId,
          propertyId: item.propertyId,
          quantity: values.quantity,
          requestFingerprint: fingerprint,
          resultingQuantity,
        },
      });
      return transaction.hotelStockLotEvent.create({
        data: {
          actorUserId: input.actorUserId,
          eventType: values.eventType,
          idempotencyKey: input.idempotencyKey,
          itemId: item.id,
          note: values.note,
          partnerId: input.partnerId,
          propertyId: item.propertyId,
          quantity: values.quantity,
          requestFingerprint: fingerprint,
          toLocationId: location.id,
          toLotId: lot.id,
        },
      });
    }

    if (values.eventType === 'TRANSFER') {
      const source = await transaction.hotelStockLot.findFirst({
        include: { item: true },
        where: { id: values.fromLotId, partnerId: input.partnerId, status: 'ACTIVE' },
      });
      const destination = await transaction.hotelStockLocation.findFirst({
        where: { id: values.toLocationId, partnerId: input.partnerId, status: 'ACTIVE' },
      });
      if (!source || !destination || source.propertyId !== destination.propertyId)
        throw new PartnerStockInventoryError(
          'STOCK_SCOPE_MISMATCH',
          'The batch and destination store must belong to the same managed property.',
        );
      if (source.locationId === destination.id)
        throw new PartnerStockInventoryError(
          'SAME_STOCK_LOCATION',
          'Choose a different destination store.',
        );
      if (source.quantityOnHand < values.quantity)
        throw new PartnerStockInventoryError(
          'INSUFFICIENT_LOT_STOCK',
          'The transfer exceeds this batch balance.',
        );
      const changed = await transaction.hotelStockLot.updateMany({
        data: { quantityOnHand: { decrement: values.quantity }, version: { increment: 1 } },
        where: { id: source.id, version: values.expectedLotVersion },
      });
      if (changed.count !== 1)
        throw new PartnerStockInventoryError(
          'STALE_STOCK_LOT',
          'The batch changed after this page loaded. Refresh and retry.',
        );
      const targetLot = await transaction.hotelStockLot.upsert({
        create: {
          expiryDate: source.expiryDate,
          itemId: source.itemId,
          locationId: destination.id,
          lotCode: source.lotCode,
          partnerId: input.partnerId,
          propertyId: source.propertyId,
          quantityOnHand: values.quantity,
        },
        update: { quantityOnHand: { increment: values.quantity }, version: { increment: 1 } },
        where: {
          itemId_locationId_lotCode: {
            itemId: source.itemId,
            locationId: destination.id,
            lotCode: source.lotCode,
          },
        },
      });
      return transaction.hotelStockLotEvent.create({
        data: {
          actorUserId: input.actorUserId,
          eventType: values.eventType,
          fromLocationId: source.locationId,
          fromLotId: source.id,
          idempotencyKey: input.idempotencyKey,
          itemId: source.itemId,
          note: values.note,
          partnerId: input.partnerId,
          propertyId: source.propertyId,
          quantity: values.quantity,
          requestFingerprint: fingerprint,
          toLocationId: destination.id,
          toLotId: targetLot.id,
        },
      });
    }

    if (values.eventType === 'WASTAGE') {
      const source = await transaction.hotelStockLot.findFirst({
        include: { item: true },
        where: { id: values.fromLotId, partnerId: input.partnerId, status: 'ACTIVE' },
      });
      if (!source)
        throw new PartnerStockInventoryError(
          'STOCK_LOT_NOT_FOUND',
          'The active batch was not found.',
        );
      if (source.quantityOnHand < values.quantity || source.item.quantityOnHand < values.quantity)
        throw new PartnerStockInventoryError(
          'INSUFFICIENT_LOT_STOCK',
          'The wastage exceeds available stock.',
        );
      const lotChanged = await transaction.hotelStockLot.updateMany({
        data: { quantityOnHand: { decrement: values.quantity }, version: { increment: 1 } },
        where: { id: source.id, version: values.expectedLotVersion },
      });
      const itemChanged = await transaction.hotelStockItem.updateMany({
        data: { quantityOnHand: { decrement: values.quantity }, version: { increment: 1 } },
        where: {
          id: source.itemId,
          partnerId: input.partnerId,
          version: values.expectedItemVersion,
        },
      });
      if (lotChanged.count !== 1 || itemChanged.count !== 1)
        throw new PartnerStockInventoryError(
          'STALE_STOCK_LOT',
          'Stock changed after this page loaded. Refresh and retry.',
        );
      const resultingQuantity = source.item.quantityOnHand - values.quantity;
      await transaction.hotelStockMovement.create({
        data: {
          actorUserId: input.actorUserId,
          idempotencyKey: `lot-${input.idempotencyKey}`,
          itemId: source.itemId,
          movementType: 'ADJUSTMENT_OUT',
          note: `${values.note} · wastage batch ${source.lotCode}`,
          partnerId: input.partnerId,
          propertyId: source.propertyId,
          quantity: values.quantity,
          requestFingerprint: fingerprint,
          resultingQuantity,
        },
      });
      return transaction.hotelStockLotEvent.create({
        data: {
          actorUserId: input.actorUserId,
          eventType: values.eventType,
          fromLocationId: source.locationId,
          fromLotId: source.id,
          idempotencyKey: input.idempotencyKey,
          itemId: source.itemId,
          note: values.note,
          partnerId: input.partnerId,
          propertyId: source.propertyId,
          quantity: values.quantity,
          requestFingerprint: fingerprint,
        },
      });
    }

    const original = await transaction.hotelStockLotEvent.findFirst({
      include: { fromLot: { include: { item: true } }, reversedBy: true },
      where: { eventType: 'WASTAGE', id: values.eventId, partnerId: input.partnerId },
    });
    if (!original?.fromLot)
      throw new PartnerStockInventoryError(
        'WASTAGE_NOT_FOUND',
        'The wastage record was not found.',
      );
    if (original.reversedBy)
      throw new PartnerStockInventoryError(
        'WASTAGE_ALREADY_REVERSED',
        'This wastage record has already been reversed.',
      );
    const lotChanged = await transaction.hotelStockLot.updateMany({
      data: { quantityOnHand: { increment: original.quantity }, version: { increment: 1 } },
      where: { id: original.fromLot.id, version: values.expectedLotVersion },
    });
    const itemChanged = await transaction.hotelStockItem.updateMany({
      data: { quantityOnHand: { increment: original.quantity }, version: { increment: 1 } },
      where: {
        id: original.itemId,
        partnerId: input.partnerId,
        version: values.expectedItemVersion,
      },
    });
    if (lotChanged.count !== 1 || itemChanged.count !== 1)
      throw new PartnerStockInventoryError(
        'STALE_STOCK_LOT',
        'Stock changed after this page loaded. Refresh and retry.',
      );
    const resultingQuantity = original.fromLot.item.quantityOnHand + original.quantity;
    await transaction.hotelStockMovement.create({
      data: {
        actorUserId: input.actorUserId,
        idempotencyKey: `lot-${input.idempotencyKey}`,
        itemId: original.itemId,
        movementType: 'ADJUSTMENT_IN',
        note: `${values.note} · reversal of wastage ${original.id}`,
        partnerId: input.partnerId,
        propertyId: original.propertyId,
        quantity: original.quantity,
        requestFingerprint: fingerprint,
        resultingQuantity,
      },
    });
    return transaction.hotelStockLotEvent.create({
      data: {
        actorUserId: input.actorUserId,
        eventType: values.eventType,
        idempotencyKey: input.idempotencyKey,
        itemId: original.itemId,
        note: values.note,
        partnerId: input.partnerId,
        propertyId: original.propertyId,
        quantity: original.quantity,
        requestFingerprint: fingerprint,
        reversalOfId: original.id,
        toLocationId: original.fromLocationId,
        toLotId: original.fromLotId,
      },
    });
  });
}

export async function createPartnerStockItem(input: {
  actorUserId: string;
  partnerId: string;
  propertyId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeStockItem(input.values);
  if (!values)
    throw new PartnerStockInventoryError('INVALID_STOCK_ITEM', 'Enter valid stock item details.');
  const property = await prisma.partnerProperty.findFirst({
    select: { id: true },
    where: {
      id: input.propertyId,
      listingSource: 'MANAGED',
      partnerId: input.partnerId,
      status: 'ACTIVE',
    },
  });
  if (!property)
    throw new PartnerStockInventoryError(
      'PROPERTY_NOT_FOUND',
      'The managed property was not found.',
    );
  try {
    return await prisma.$transaction(async (transaction) => {
      const item = await transaction.hotelStockItem.create({
        data: { ...values, partnerId: input.partnerId, propertyId: property.id },
      });
      if (values.quantityOnHand > 0) {
        const opening = {
          itemId: item.id,
          movementType: 'ADJUSTMENT_IN',
          note: 'Opening stock balance',
          quantity: values.quantityOnHand,
        };
        await transaction.hotelStockMovement.create({
          data: {
            ...opening,
            actorUserId: input.actorUserId,
            idempotencyKey: `stock-item-opening-${item.id}`,
            partnerId: input.partnerId,
            propertyId: property.id,
            requestFingerprint: stockRequestFingerprint(opening),
            resultingQuantity: values.quantityOnHand,
          },
        });
      }
      return item;
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw new PartnerStockInventoryError('SKU_EXISTS', 'This property already has that SKU.');
    }
    throw error;
  }
}

export async function recordPartnerStockMovement(input: {
  actorUserId: string;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeStockMovement(input.values);
  if (!values || input.idempotencyKey.trim().length < 16 || input.idempotencyKey.length > 120) {
    throw new PartnerStockInventoryError(
      'INVALID_STOCK_MOVEMENT',
      'Enter a valid quantity, reason, and retry key.',
    );
  }
  const fingerprint = stockRequestFingerprint({ partnerId: input.partnerId, ...values });
  return prisma.$transaction(async (transaction) => {
    const replay = await transaction.hotelStockMovement.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (replay) {
      if (replay.partnerId !== input.partnerId || replay.requestFingerprint !== fingerprint) {
        throw new PartnerStockInventoryError(
          'IDEMPOTENCY_CONFLICT',
          'That retry key belongs to another stock change.',
        );
      }
      return replay;
    }
    const item = await transaction.hotelStockItem.findFirst({
      where: { id: values.itemId, partnerId: input.partnerId, status: 'ACTIVE' },
    });
    if (!item)
      throw new PartnerStockInventoryError(
        'STOCK_ITEM_NOT_FOUND',
        'The active stock item was not found.',
      );
    const delta = stockMovementDelta(values.movementType, values.quantity);
    const resultingQuantity = item.quantityOnHand + delta;
    if (resultingQuantity < 0)
      throw new PartnerStockInventoryError(
        'INSUFFICIENT_STOCK',
        'The issue would make on-hand stock negative.',
      );
    const updated = await transaction.hotelStockItem.updateMany({
      data: { quantityOnHand: resultingQuantity, version: { increment: 1 } },
      where: { id: item.id, partnerId: input.partnerId, version: values.expectedVersion },
    });
    if (updated.count !== 1)
      throw new PartnerStockInventoryError(
        'STALE_STOCK_ITEM',
        'Stock changed after this page loaded. Refresh and retry.',
      );
    return transaction.hotelStockMovement.create({
      data: {
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        itemId: item.id,
        movementType: values.movementType,
        note: values.note,
        partnerId: input.partnerId,
        propertyId: item.propertyId,
        quantity: values.quantity,
        requestFingerprint: fingerprint,
        resultingQuantity,
      },
    });
  });
}
