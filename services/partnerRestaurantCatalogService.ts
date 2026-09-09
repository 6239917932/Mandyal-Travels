import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  normalizeRestaurantMenuItem,
  normalizeRestaurantOutlet,
  normalizeRestaurantStatus,
  normalizeRestaurantTable,
  restaurantCatalogFingerprint,
  type HotelRestaurantEntityType,
} from '@/lib/pms/restaurantCatalog';

const MAX_PROPERTIES = 100;
const MAX_OUTLETS = 100;
const MAX_TABLES = 500;
const MAX_MENU_ITEMS = 1_000;
const MAX_EVENTS = 500;

export class PartnerRestaurantCatalogError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function requireIdempotencyKey(value: string) {
  const key = value.trim();
  if (key.length < 16 || key.length > 120)
    throw new PartnerRestaurantCatalogError('INVALID_RETRY_KEY', 'Start this action again.');
  return key;
}

export async function getPartnerRestaurantCatalogWorkspace(partnerId: string) {
  const [properties, outlets, tables, menuItems, events] = await Promise.all([
    prisma.partnerProperty.findMany({
      orderBy: { displayName: 'asc' },
      select: { displayName: true, id: true },
      take: MAX_PROPERTIES + 1,
      where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelRestaurantOutlet.findMany({
      include: { property: { select: { displayName: true } } },
      orderBy: [{ status: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      take: MAX_OUTLETS + 1,
      where: { partnerId },
    }),
    prisma.hotelRestaurantTable.findMany({
      include: { outlet: { select: { name: true } }, property: { select: { displayName: true } } },
      orderBy: [{ status: 'asc' }, { tableCode: 'asc' }, { id: 'asc' }],
      take: MAX_TABLES + 1,
      where: { partnerId },
    }),
    prisma.hotelRestaurantMenuItem.findMany({
      include: { outlet: { select: { name: true } }, property: { select: { displayName: true } } },
      orderBy: [{ status: 'asc' }, { category: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      take: MAX_MENU_ITEMS + 1,
      where: { partnerId },
    }),
    prisma.hotelRestaurantEvent.findMany({
      include: { property: { select: { displayName: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_EVENTS + 1,
      where: { partnerId },
    }),
  ]);
  return {
    events: events.slice(0, MAX_EVENTS),
    menuItems: menuItems.slice(0, MAX_MENU_ITEMS),
    outlets: outlets.slice(0, MAX_OUTLETS),
    properties: properties.slice(0, MAX_PROPERTIES),
    safetyLimitReached:
      properties.length > MAX_PROPERTIES ||
      outlets.length > MAX_OUTLETS ||
      tables.length > MAX_TABLES ||
      menuItems.length > MAX_MENU_ITEMS ||
      events.length > MAX_EVENTS,
    tables: tables.slice(0, MAX_TABLES),
  } as const;
}

async function requireManagedProperty(partnerId: string, propertyId: string) {
  const property = await prisma.partnerProperty.findFirst({
    select: { id: true },
    where: { id: propertyId, listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
  if (!property)
    throw new PartnerRestaurantCatalogError(
      'PROPERTY_NOT_FOUND',
      'The active managed property was not found.',
    );
  return property;
}

async function replayEntity(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  input: { fingerprint: string; idempotencyKey: string; partnerId: string },
) {
  const replay = await transaction.hotelRestaurantEvent.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (!replay) return null;
  if (replay.partnerId !== input.partnerId || replay.requestFingerprint !== input.fingerprint)
    throw new PartnerRestaurantCatalogError(
      'IDEMPOTENCY_CONFLICT',
      'That retry key belongs to another restaurant action.',
    );
  return replay;
}

function duplicateError(error: unknown, message: string): never {
  if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002')
    throw new PartnerRestaurantCatalogError('CATALOG_DUPLICATE', message);
  throw error;
}

export async function createPartnerRestaurantOutlet(input: {
  actorUserId: string;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeRestaurantOutlet(input.values);
  if (!values)
    throw new PartnerRestaurantCatalogError('INVALID_OUTLET', 'Enter valid outlet details.');
  const key = requireIdempotencyKey(input.idempotencyKey);
  await requireManagedProperty(input.partnerId, values.propertyId);
  const fingerprint = restaurantCatalogFingerprint({ action: 'CREATE_OUTLET', ...values });
  try {
    return await prisma.$transaction(async (transaction) => {
      const replay = await replayEntity(transaction, {
        fingerprint,
        idempotencyKey: key,
        partnerId: input.partnerId,
      });
      if (replay) return { id: replay.entityId, replayed: true };
      const outlet = await transaction.hotelRestaurantOutlet.create({
        data: {
          ...values,
          createdByUserId: input.actorUserId,
          partnerId: input.partnerId,
        },
      });
      await transaction.hotelRestaurantEvent.create({
        data: {
          action: 'CREATED',
          actorUserId: input.actorUserId,
          entityId: outlet.id,
          entityType: 'OUTLET',
          fromStatus: 'NONE',
          idempotencyKey: key,
          note: 'Restaurant outlet registered.',
          partnerId: input.partnerId,
          propertyId: outlet.propertyId,
          requestFingerprint: fingerprint,
          toStatus: outlet.status,
          version: outlet.version,
        },
      });
      return { id: outlet.id, replayed: false };
    });
  } catch (error) {
    duplicateError(error, 'This property already has that outlet code.');
  }
}

async function requireActiveOutlet(partnerId: string, outletId: string) {
  const outlet = await prisma.hotelRestaurantOutlet.findFirst({
    where: {
      id: outletId,
      partnerId,
      property: { listingSource: 'MANAGED', status: 'ACTIVE' },
      status: 'ACTIVE',
    },
  });
  if (!outlet)
    throw new PartnerRestaurantCatalogError(
      'OUTLET_NOT_FOUND',
      'The active restaurant outlet was not found.',
    );
  return outlet;
}

export async function createPartnerRestaurantTable(input: {
  actorUserId: string;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeRestaurantTable(input.values);
  if (!values)
    throw new PartnerRestaurantCatalogError('INVALID_TABLE', 'Enter valid table details.');
  const key = requireIdempotencyKey(input.idempotencyKey);
  const outlet = await requireActiveOutlet(input.partnerId, values.outletId);
  const fingerprint = restaurantCatalogFingerprint({ action: 'CREATE_TABLE', ...values });
  try {
    return await prisma.$transaction(async (transaction) => {
      const replay = await replayEntity(transaction, {
        fingerprint,
        idempotencyKey: key,
        partnerId: input.partnerId,
      });
      if (replay) return { id: replay.entityId, replayed: true };
      const table = await transaction.hotelRestaurantTable.create({
        data: {
          ...values,
          createdByUserId: input.actorUserId,
          partnerId: input.partnerId,
          propertyId: outlet.propertyId,
        },
      });
      await transaction.hotelRestaurantEvent.create({
        data: {
          action: 'CREATED',
          actorUserId: input.actorUserId,
          entityId: table.id,
          entityType: 'TABLE',
          fromStatus: 'NONE',
          idempotencyKey: key,
          note: 'Restaurant table registered.',
          partnerId: input.partnerId,
          propertyId: table.propertyId,
          requestFingerprint: fingerprint,
          toStatus: table.status,
          version: table.version,
        },
      });
      return { id: table.id, replayed: false };
    });
  } catch (error) {
    duplicateError(error, 'This outlet already has that table code.');
  }
}

export async function createPartnerRestaurantMenuItem(input: {
  actorUserId: string;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeRestaurantMenuItem(input.values);
  if (!values)
    throw new PartnerRestaurantCatalogError('INVALID_MENU_ITEM', 'Enter valid menu item details.');
  const key = requireIdempotencyKey(input.idempotencyKey);
  const outlet = await requireActiveOutlet(input.partnerId, values.outletId);
  const fingerprint = restaurantCatalogFingerprint({ action: 'CREATE_MENU_ITEM', ...values });
  try {
    return await prisma.$transaction(async (transaction) => {
      const replay = await replayEntity(transaction, {
        fingerprint,
        idempotencyKey: key,
        partnerId: input.partnerId,
      });
      if (replay) return { id: replay.entityId, replayed: true };
      const menuItem = await transaction.hotelRestaurantMenuItem.create({
        data: {
          ...values,
          createdByUserId: input.actorUserId,
          partnerId: input.partnerId,
          propertyId: outlet.propertyId,
        },
      });
      await transaction.hotelRestaurantEvent.create({
        data: {
          action: 'CREATED',
          actorUserId: input.actorUserId,
          entityId: menuItem.id,
          entityType: 'MENU_ITEM',
          fromStatus: 'NONE',
          idempotencyKey: key,
          note: 'Restaurant menu item registered.',
          partnerId: input.partnerId,
          propertyId: menuItem.propertyId,
          requestFingerprint: fingerprint,
          toStatus: menuItem.status,
          version: menuItem.version,
        },
      });
      return { id: menuItem.id, replayed: false };
    });
  } catch (error) {
    duplicateError(error, 'This outlet already has a menu item with that category and name.');
  }
}

export async function changePartnerRestaurantEntityStatus(input: {
  actorUserId: string;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeRestaurantStatus(input.values);
  if (!values)
    throw new PartnerRestaurantCatalogError(
      'INVALID_STATUS_ACTION',
      'Choose a valid item, status, version, and reason.',
    );
  const key = requireIdempotencyKey(input.idempotencyKey);
  const fingerprint = restaurantCatalogFingerprint({ partnerId: input.partnerId, ...values });
  return prisma.$transaction(async (transaction) => {
    const replay = await replayEntity(transaction, {
      fingerprint,
      idempotencyKey: key,
      partnerId: input.partnerId,
    });
    if (replay) return replay;

    let current: { propertyId: string; status: string; version: number } | null = null;
    let changed = 0;
    const where = { id: values.entityId, partnerId: input.partnerId };
    if (values.entityType === 'OUTLET') {
      current = await transaction.hotelRestaurantOutlet.findFirst({ where });
      if (current)
        changed = (
          await transaction.hotelRestaurantOutlet.updateMany({
            data: { status: values.status, version: { increment: 1 } },
            where: { ...where, version: values.expectedVersion },
          })
        ).count;
    } else if (values.entityType === 'TABLE') {
      current = await transaction.hotelRestaurantTable.findFirst({ where });
      if (current)
        changed = (
          await transaction.hotelRestaurantTable.updateMany({
            data: { status: values.status, version: { increment: 1 } },
            where: { ...where, version: values.expectedVersion },
          })
        ).count;
    } else {
      current = await transaction.hotelRestaurantMenuItem.findFirst({ where });
      if (current)
        changed = (
          await transaction.hotelRestaurantMenuItem.updateMany({
            data: { status: values.status, version: { increment: 1 } },
            where: { ...where, version: values.expectedVersion },
          })
        ).count;
    }
    if (!current)
      throw new PartnerRestaurantCatalogError(
        'ENTITY_NOT_FOUND',
        'The restaurant item was not found.',
      );
    if (current.status === values.status)
      throw new PartnerRestaurantCatalogError(
        'STATUS_UNCHANGED',
        'The selected status is already active.',
      );
    if (changed !== 1)
      throw new PartnerRestaurantCatalogError(
        'STALE_RESTAURANT_ITEM',
        'This item changed after the page loaded. Refresh and retry.',
      );
    const action =
      values.status === 'ACTIVE'
        ? 'ACTIVATED'
        : values.entityType === 'TABLE'
          ? 'MARKED_OUT_OF_SERVICE'
          : 'PAUSED';
    return transaction.hotelRestaurantEvent.create({
      data: {
        action,
        actorUserId: input.actorUserId,
        entityId: values.entityId,
        entityType: values.entityType,
        fromStatus: current.status,
        idempotencyKey: key,
        note: values.note,
        partnerId: input.partnerId,
        propertyId: current.propertyId,
        requestFingerprint: fingerprint,
        toStatus: values.status,
        version: current.version + 1,
      },
    });
  });
}

export function restaurantEntityLabel(type: HotelRestaurantEntityType): string {
  return type === 'MENU_ITEM' ? 'menu item' : type.toLowerCase();
}
