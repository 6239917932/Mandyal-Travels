import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  type HotelBanquetStatus,
  hotelBanquetFingerprint,
  nextHotelBanquetStatuses,
  normalizeHotelBanquetEvent,
  normalizeHotelBanquetTransition,
  requireHotelBanquetIdempotencyKey,
} from '@/lib/pms/banquets';
import { resolveOperationalDate } from '@/lib/pms/operationalDate';

const MAX_PROPERTIES = 100;
const MAX_EVENTS = 200;
const MAX_HISTORY = 20;

export class PartnerBanquetError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function assertVenueAvailable(
  transaction: Prisma.TransactionClient,
  input: {
    endTime: string;
    eventDate: string;
    excludeEventId?: string;
    propertyId: string;
    startTime: string;
    venueName: string;
  },
) {
  const conflict = await transaction.hotelBanquetEvent.findFirst({
    select: { eventName: true },
    where: {
      endTime: { gt: input.startTime },
      eventDate: input.eventDate,
      id: input.excludeEventId ? { not: input.excludeEventId } : undefined,
      propertyId: input.propertyId,
      startTime: { lt: input.endTime },
      status: { in: ['PROVISIONAL', 'CONFIRMED'] },
      venueName: input.venueName,
    },
  });
  if (conflict) {
    throw new PartnerBanquetError(
      'VENUE_TIME_CONFLICT',
      `This venue is already held for ${conflict.eventName} during that time.`,
    );
  }
}

export async function getPartnerBanquetWorkspace(input: {
  partnerId: string;
  requestedPropertyId?: string;
}) {
  const storedProperties = await prisma.partnerProperty.findMany({
    orderBy: { displayName: 'asc' },
    select: { displayName: true, id: true, operationalDate: true, timezone: true },
    take: MAX_PROPERTIES + 1,
    where: {
      listingSource: 'MANAGED',
      partnerId: input.partnerId,
      status: 'ACTIVE',
    },
  });
  const properties = storedProperties.slice(0, MAX_PROPERTIES);
  const selected =
    properties.find((property) => property.id === input.requestedPropertyId) ?? properties[0];
  if (!selected) {
    return { events: [], properties: [], safetyLimitReached: storedProperties.length > 0 } as const;
  }
  const storedEvents = await prisma.hotelBanquetEvent.findMany({
    include: { events: { orderBy: { createdAt: 'desc' }, take: MAX_HISTORY } },
    orderBy: [{ eventDate: 'asc' }, { startTime: 'asc' }],
    take: MAX_EVENTS + 1,
    where: { partnerId: input.partnerId, propertyId: selected.id },
  });
  return {
    businessDate: resolveOperationalDate(selected.operationalDate, selected.timezone),
    events: storedEvents.slice(0, MAX_EVENTS).map((event) => ({
      contactEmail: event.contactEmail,
      contactPhone: event.contactPhone,
      currency: event.currency,
      endTime: event.endTime,
      eventDate: event.eventDate,
      eventName: event.eventName,
      eventType: event.eventType,
      expectedGuests: event.expectedGuests,
      history: event.events.map((entry) => ({
        action: entry.action,
        createdAt: entry.createdAt.toISOString(),
        fromStatus: entry.fromStatus,
        note: entry.note,
        toStatus: entry.toStatus,
      })),
      id: event.id,
      nextStatuses: nextHotelBanquetStatuses(event.status as HotelBanquetStatus),
      organizerName: event.organizerName,
      quoteAmount: event.quoteAmount,
      requirements: event.requirements,
      startTime: event.startTime,
      status: event.status,
      venueName: event.venueName,
      version: event.version,
    })),
    properties: properties.map((property) => ({ id: property.id, name: property.displayName })),
    safetyLimitReached:
      storedProperties.length > MAX_PROPERTIES || storedEvents.length > MAX_EVENTS,
    selectedProperty: { id: selected.id, name: selected.displayName },
  } as const;
}

export async function createPartnerBanquetEvent(input: {
  actorUserId: string;
  contactEmail?: unknown;
  contactPhone?: unknown;
  endTime?: unknown;
  eventDate?: unknown;
  eventName?: unknown;
  eventType?: unknown;
  expectedGuests?: unknown;
  idempotencyKey: string;
  organizerName?: unknown;
  partnerId: string;
  propertyId: string;
  quoteAmount?: unknown;
  requirements?: unknown;
  startTime?: unknown;
  venueName?: unknown;
}) {
  const idempotencyKey = requireHotelBanquetIdempotencyKey(input.idempotencyKey);
  const normalized = normalizeHotelBanquetEvent(input);
  const requestFingerprint = hotelBanquetFingerprint({
    ...normalized,
    partnerId: input.partnerId,
    propertyId: input.propertyId,
  });
  return prisma.$transaction(
    async (transaction) => {
      const existing = await transaction.hotelBanquetEvent.findUnique({
        where: { createIdempotencyKey: idempotencyKey },
      });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new PartnerBanquetError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key belongs to another event.',
          );
        }
        return existing;
      }
      const property = await transaction.partnerProperty.findFirst({
        where: {
          id: input.propertyId,
          listingSource: 'MANAGED',
          partnerId: input.partnerId,
          status: 'ACTIVE',
        },
      });
      if (!property) {
        throw new PartnerBanquetError(
          'PROPERTY_NOT_FOUND',
          'Choose an active managed property assigned to this partner.',
        );
      }
      const businessDate = resolveOperationalDate(property.operationalDate, property.timezone);
      if (normalized.eventDate < businessDate) {
        throw new PartnerBanquetError('EVENT_DATE_PASSED', 'The event date cannot be in the past.');
      }
      const event = await transaction.hotelBanquetEvent.create({
        data: {
          ...normalized,
          createIdempotencyKey: idempotencyKey,
          createdByUserId: input.actorUserId,
          currency: 'INR',
          partnerId: input.partnerId,
          propertyId: property.id,
          requestFingerprint,
        },
      });
      await transaction.hotelBanquetEventHistory.create({
        data: {
          action: 'CREATE',
          actorUserId: input.actorUserId,
          banquetEventId: event.id,
          fromStatus: 'NONE',
          idempotencyKey,
          requestFingerprint,
          toStatus: 'INQUIRY',
          version: 1,
        },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'HOTEL_BANQUET_EVENT_CREATED',
          actorUserId: input.actorUserId,
          entityId: event.id,
          entityType: 'HOTEL_BANQUET_EVENT',
          metadataJson: JSON.stringify({
            eventDate: event.eventDate,
            eventType: event.eventType,
            propertyId: event.propertyId,
            quoteAmount: event.quoteAmount,
            venueName: event.venueName,
          }),
          partnerId: input.partnerId,
          summary: `${event.eventName} banquet enquiry recorded for ${event.eventDate}.`,
        },
      });
      return event;
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function transitionPartnerBanquetEvent(input: {
  actorUserId: string;
  banquetEventId: string;
  idempotencyKey: string;
  note?: unknown;
  partnerId: string;
  targetStatus?: unknown;
  version: number;
}) {
  const idempotencyKey = requireHotelBanquetIdempotencyKey(input.idempotencyKey);
  if (!Number.isSafeInteger(input.version) || input.version < 1) {
    throw new PartnerBanquetError('STALE_EVENT', 'Refresh the event and try again.');
  }
  const requestFingerprint = hotelBanquetFingerprint({
    banquetEventId: input.banquetEventId,
    note:
      typeof input.note === 'string' ? input.note.trim().replace(/\s+/g, ' ').slice(0, 500) : '',
    partnerId: input.partnerId,
    targetStatus: String(input.targetStatus ?? '')
      .trim()
      .toUpperCase(),
    version: input.version,
  });
  return prisma.$transaction(
    async (transaction) => {
      const existingHistory = await transaction.hotelBanquetEventHistory.findUnique({
        where: { idempotencyKey },
      });
      if (existingHistory) {
        if (existingHistory.requestFingerprint !== requestFingerprint) {
          throw new PartnerBanquetError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key belongs to another event action.',
          );
        }
        const existingEvent = await transaction.hotelBanquetEvent.findFirst({
          where: { id: existingHistory.banquetEventId, partnerId: input.partnerId },
        });
        if (!existingEvent) throw new PartnerBanquetError('EVENT_NOT_FOUND', 'Event not found.');
        return existingEvent;
      }
      const event = await transaction.hotelBanquetEvent.findFirst({
        include: { property: true },
        where: { id: input.banquetEventId, partnerId: input.partnerId },
      });
      if (!event) throw new PartnerBanquetError('EVENT_NOT_FOUND', 'Event not found.');
      if (
        event.property.partnerId !== input.partnerId ||
        event.property.listingSource !== 'MANAGED' ||
        event.property.status !== 'ACTIVE'
      ) {
        throw new PartnerBanquetError('PROPERTY_NOT_FOUND', 'The managed property is not active.');
      }
      if (event.version !== input.version) {
        throw new PartnerBanquetError('STALE_EVENT', 'This event changed. Refresh and try again.');
      }
      const transition = normalizeHotelBanquetTransition({
        currentStatus: event.status,
        note: input.note,
        targetStatus: input.targetStatus,
      });
      if (['PROVISIONAL', 'CONFIRMED'].includes(transition.targetStatus)) {
        await assertVenueAvailable(transaction, {
          endTime: event.endTime,
          eventDate: event.eventDate,
          excludeEventId: event.id,
          propertyId: event.propertyId,
          startTime: event.startTime,
          venueName: event.venueName,
        });
      }
      const updated = await transaction.hotelBanquetEvent.updateMany({
        data: { status: transition.targetStatus, version: { increment: 1 } },
        where: { id: event.id, partnerId: input.partnerId, version: input.version },
      });
      if (updated.count !== 1) {
        throw new PartnerBanquetError('STALE_EVENT', 'This event changed. Refresh and try again.');
      }
      await transaction.hotelBanquetEventHistory.create({
        data: {
          action: 'TRANSITION',
          actorUserId: input.actorUserId,
          banquetEventId: event.id,
          fromStatus: event.status,
          idempotencyKey,
          note: transition.note,
          requestFingerprint,
          toStatus: transition.targetStatus,
          version: event.version + 1,
        },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: `HOTEL_BANQUET_EVENT_${transition.targetStatus}`,
          actorUserId: input.actorUserId,
          entityId: event.id,
          entityType: 'HOTEL_BANQUET_EVENT',
          metadataJson: JSON.stringify({
            eventDate: event.eventDate,
            fromStatus: event.status,
            propertyId: event.propertyId,
            toStatus: transition.targetStatus,
            venueName: event.venueName,
          }),
          partnerId: input.partnerId,
          summary: `${event.eventName} moved to ${transition.targetStatus.toLowerCase()}.`,
        },
      });
      return { ...event, status: transition.targetStatus, version: event.version + 1 };
    },
    { isolationLevel: 'Serializable' },
  );
}
