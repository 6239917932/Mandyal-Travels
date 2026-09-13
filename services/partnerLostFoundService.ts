import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  isLostFoundTransitionAllowed,
  lostFoundRequestFingerprint,
  normalizeLostFoundEvent,
  normalizeLostFoundItem,
} from '@/lib/pms/lostFound';

const MAX_PROPERTIES = 100;
const MAX_ITEMS = 500;
const MAX_EVENTS = 500;

export class PartnerLostFoundError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function getPartnerLostFoundWorkspace(partnerId: string) {
  const [properties, items, events] = await Promise.all([
    prisma.partnerProperty.findMany({
      orderBy: { displayName: 'asc' },
      select: { displayName: true, id: true },
      take: MAX_PROPERTIES + 1,
      where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelLostFoundItem.findMany({
      include: { property: { select: { displayName: true } } },
      orderBy: [{ status: 'asc' }, { foundOn: 'desc' }, { id: 'asc' }],
      take: MAX_ITEMS + 1,
      where: { partnerId },
    }),
    prisma.hotelLostFoundEvent.findMany({
      include: {
        item: { select: { itemName: true, referenceCode: true } },
        property: { select: { displayName: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_EVENTS + 1,
      where: { partnerId },
    }),
  ]);
  return {
    events: events.slice(0, MAX_EVENTS),
    items: items.slice(0, MAX_ITEMS),
    properties: properties.slice(0, MAX_PROPERTIES),
    safetyLimitReached:
      properties.length > MAX_PROPERTIES || items.length > MAX_ITEMS || events.length > MAX_EVENTS,
  } as const;
}

export async function createPartnerLostFoundItem(input: {
  actorUserId: string;
  partnerId: string;
  propertyId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeLostFoundItem(input.values);
  if (!values)
    throw new PartnerLostFoundError('INVALID_LOST_FOUND_ITEM', 'Enter valid custody details.');
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
    throw new PartnerLostFoundError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
  try {
    return await prisma.$transaction(async (transaction) => {
      const item = await transaction.hotelLostFoundItem.create({
        data: {
          ...values,
          createdByUserId: input.actorUserId,
          partnerId: input.partnerId,
          propertyId: property.id,
        },
      });
      const opening = {
        itemId: item.id,
        note: `Received into secure storage at ${values.storageLocation}.`,
        version: item.version,
      };
      await transaction.hotelLostFoundEvent.create({
        data: {
          ...opening,
          action: 'REGISTERED',
          actorUserId: input.actorUserId,
          fromStatus: 'NONE',
          idempotencyKey: `lost-found-opening-${item.id}`,
          partnerId: input.partnerId,
          propertyId: property.id,
          requestFingerprint: lostFoundRequestFingerprint(opening),
          toStatus: item.status,
        },
      });
      return item;
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw new PartnerLostFoundError(
        'LOST_FOUND_REFERENCE_EXISTS',
        'This property already has that custody reference.',
      );
    }
    throw error;
  }
}

export async function recordPartnerLostFoundEvent(input: {
  actorUserId: string;
  allowDisposal: boolean;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeLostFoundEvent(input.values);
  const idempotencyKey = input.idempotencyKey.trim();
  if (!values || idempotencyKey.length < 16 || idempotencyKey.length > 120) {
    throw new PartnerLostFoundError(
      'INVALID_LOST_FOUND_ACTION',
      'Enter a valid status action, reason, evidence, and retry key.',
    );
  }
  if (values.toStatus === 'DISPOSED' && !input.allowDisposal) {
    throw new PartnerLostFoundError(
      'PARTNER_ADMIN_REQUIRED',
      'Only a supplier administrator can authorize disposal.',
    );
  }
  const fingerprint = lostFoundRequestFingerprint({ partnerId: input.partnerId, ...values });
  return prisma.$transaction(async (transaction) => {
    const replay = await transaction.hotelLostFoundEvent.findUnique({ where: { idempotencyKey } });
    if (replay) {
      if (replay.partnerId !== input.partnerId || replay.requestFingerprint !== fingerprint) {
        throw new PartnerLostFoundError(
          'IDEMPOTENCY_CONFLICT',
          'That retry key belongs to another custody action.',
        );
      }
      return replay;
    }
    const item = await transaction.hotelLostFoundItem.findFirst({
      where: { id: values.itemId, partnerId: input.partnerId },
    });
    if (!item)
      throw new PartnerLostFoundError(
        'LOST_FOUND_ITEM_NOT_FOUND',
        'The custody item was not found.',
      );
    if (!isLostFoundTransitionAllowed(item.status, values.toStatus)) {
      throw new PartnerLostFoundError(
        'INVALID_LOST_FOUND_TRANSITION',
        `An item in ${item.status.toLowerCase().replaceAll('_', ' ')} cannot move to ${values.toStatus.toLowerCase().replaceAll('_', ' ')}.`,
      );
    }
    const updated = await transaction.hotelLostFoundItem.updateMany({
      data: { status: values.toStatus, version: { increment: 1 } },
      where: { id: item.id, partnerId: input.partnerId, version: values.expectedVersion },
    });
    if (updated.count !== 1) {
      throw new PartnerLostFoundError(
        'STALE_LOST_FOUND_ITEM',
        'The custody item changed after this page loaded. Refresh and retry.',
      );
    }
    return transaction.hotelLostFoundEvent.create({
      data: {
        action: values.toStatus,
        actorUserId: input.actorUserId,
        fromStatus: item.status,
        idempotencyKey,
        itemId: item.id,
        note: values.note,
        partnerId: input.partnerId,
        propertyId: item.propertyId,
        releaseEvidenceReference: values.releaseEvidenceReference,
        releasedTo: values.releasedTo,
        requestFingerprint: fingerprint,
        toStatus: values.toStatus,
        version: item.version + 1,
      },
    });
  });
}
