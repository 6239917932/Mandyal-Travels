import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  normalizeStockItem,
  normalizeStockMovement,
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
  const [properties, items, movements] = await Promise.all([
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
  ]);
  return {
    items: items.slice(0, MAX_ITEMS),
    movements: movements.slice(0, MAX_MOVEMENTS),
    properties,
    safetyLimitReached: items.length > MAX_ITEMS || movements.length > MAX_MOVEMENTS,
  } as const;
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
