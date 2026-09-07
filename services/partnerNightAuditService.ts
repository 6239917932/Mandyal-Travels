import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  countNightAuditBlockers,
  nightAuditFingerprint,
  normalizeNightAuditClose,
  requireNightAuditIdempotencyKey,
} from '@/lib/pms/nightAudit';
import {
  calendarDateInTimezone,
  nextOperationalDate,
  resolveOperationalDate,
} from '@/lib/pms/operationalDate';

const MAX_PROPERTIES = 100;
const MAX_HISTORY = 30;

export class PartnerNightAuditError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type AuditClient = Pick<
  Prisma.TransactionClient,
  | 'booking'
  | 'bookingAmendment'
  | 'hotelCashierShift'
  | 'hotelMaintenanceWorkOrder'
  | 'partnerPhysicalRoom'
>;

async function readAuditSnapshot(
  client: AuditClient,
  property: { hotelSlug: string; id: string },
  businessDate: string,
) {
  const [
    openCashierShifts,
    unresolvedArrivals,
    overdueDepartures,
    pendingAmendments,
    urgentMaintenance,
    activeMaintenance,
    occupiedRooms,
    roomStates,
  ] = await Promise.all([
    client.hotelCashierShift.count({ where: { propertyId: property.id, status: 'OPEN' } }),
    client.booking.count({
      where: {
        hotelSlug: property.hotelSlug,
        operationalStatus: 'RESERVED',
        quote: { checkInDate: { lte: businessDate } },
        status: 'confirmed',
      },
    }),
    client.booking.count({
      where: {
        hotelSlug: property.hotelSlug,
        operationalStatus: 'CHECKED_IN',
        quote: { checkOutDate: { lte: businessDate } },
        status: 'confirmed',
      },
    }),
    client.bookingAmendment.count({
      where: { booking: { hotelSlug: property.hotelSlug }, status: 'pending' },
    }),
    client.hotelMaintenanceWorkOrder.count({
      where: {
        priority: 'URGENT',
        propertyId: property.id,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    }),
    client.hotelMaintenanceWorkOrder.count({
      where: { propertyId: property.id, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    client.booking.count({
      where: {
        hotelSlug: property.hotelSlug,
        operationalStatus: 'CHECKED_IN',
        status: 'confirmed',
      },
    }),
    client.partnerPhysicalRoom.groupBy({
      _count: { _all: true },
      by: ['housekeepingStatus', 'operationalStatus'],
      where: { propertyId: property.id },
    }),
  ]);
  const blockers = {
    openCashierShifts,
    overdueDepartures,
    pendingAmendments,
    unresolvedArrivals,
    urgentMaintenance,
  };
  return {
    blockers,
    blockerCount: countNightAuditBlockers(blockers),
    counts: {
      activeMaintenance,
      dirtyRooms: roomStates
        .filter((state) => state.housekeepingStatus === 'DIRTY')
        .reduce((total, state) => total + state._count._all, 0),
      occupiedRooms,
      outOfServiceRooms: roomStates
        .filter((state) => state.operationalStatus !== 'ACTIVE')
        .reduce((total, state) => total + state._count._all, 0),
      readyRooms: roomStates
        .filter(
          (state) => state.housekeepingStatus === 'READY' && state.operationalStatus === 'ACTIVE',
        )
        .reduce((total, state) => total + state._count._all, 0),
      totalRooms: roomStates.reduce((total, state) => total + state._count._all, 0),
    },
  } as const;
}

export async function getPartnerNightAuditWorkspace(
  partnerId: string,
  requestedPropertyId?: string,
) {
  const storedProperties = await prisma.partnerProperty.findMany({
    orderBy: { displayName: 'asc' },
    select: {
      displayName: true,
      hotelSlug: true,
      id: true,
      operationalDate: true,
      operationalDateVersion: true,
      timezone: true,
    },
    take: MAX_PROPERTIES + 1,
    where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
  const boundedProperties = storedProperties.slice(0, MAX_PROPERTIES);
  const selected =
    boundedProperties.find((property) => property.id === requestedPropertyId) ??
    boundedProperties[0];
  if (!selected) {
    return {
      history: [],
      properties: [],
      safetyLimitReached: storedProperties.length > MAX_PROPERTIES,
    } as const;
  }
  const operationalDate = resolveOperationalDate(selected.operationalDate, selected.timezone);
  const [snapshot, history] = await Promise.all([
    readAuditSnapshot(prisma, selected, operationalDate),
    prisma.hotelNightAuditClose.findMany({
      orderBy: { closedAt: 'desc' },
      select: {
        businessDate: true,
        closeNote: true,
        closedAt: true,
        nextBusinessDate: true,
        snapshotJson: true,
      },
      take: MAX_HISTORY,
      where: { propertyId: selected.id },
    }),
  ]);
  const calendarDate = calendarDateInTimezone(selected.timezone);
  return {
    calendarDate,
    canCloseToday: operationalDate <= calendarDate,
    history: history.map((entry) => ({ ...entry, closedAt: entry.closedAt.toISOString() })),
    operationalDate,
    properties: boundedProperties.map((property) => ({
      id: property.id,
      name: property.displayName,
      operationalDate: resolveOperationalDate(property.operationalDate, property.timezone),
    })),
    safetyLimitReached: storedProperties.length > MAX_PROPERTIES,
    selectedProperty: { id: selected.id, name: selected.displayName },
    snapshot,
    version: selected.operationalDateVersion,
  } as const;
}

export async function closePartnerOperationalDate(input: {
  actorUserId: string;
  businessDate?: unknown;
  confirmation?: unknown;
  idempotencyKey: string;
  note?: unknown;
  partnerId: string;
  propertyId: string;
  version: number;
}) {
  const close = normalizeNightAuditClose(input);
  const idempotencyKey = requireNightAuditIdempotencyKey(input.idempotencyKey);
  if (!Number.isSafeInteger(input.version) || input.version < 0) {
    throw new PartnerNightAuditError(
      'STALE_OPERATIONAL_DATE',
      'Refresh the night audit and try again.',
    );
  }
  const requestFingerprint = nightAuditFingerprint({
    businessDate: close.businessDate,
    note: close.note,
    partnerId: input.partnerId,
    propertyId: input.propertyId,
  });
  return prisma.$transaction(
    async (transaction) => {
      const existing = await transaction.hotelNightAuditClose.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new PartnerNightAuditError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key is already connected to another operational close.',
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
        throw new PartnerNightAuditError(
          'PROPERTY_NOT_FOUND',
          'Choose an active managed property assigned to this partner.',
        );
      }
      const operationalDate = resolveOperationalDate(property.operationalDate, property.timezone);
      if (
        operationalDate !== close.businessDate ||
        property.operationalDateVersion !== input.version
      ) {
        throw new PartnerNightAuditError(
          'STALE_OPERATIONAL_DATE',
          'The operational date changed. Refresh before closing it.',
        );
      }
      if (operationalDate > calendarDateInTimezone(property.timezone)) {
        throw new PartnerNightAuditError(
          'FUTURE_OPERATIONAL_DATE',
          'The next operational date cannot be closed before its local calendar day.',
        );
      }
      const snapshot = await readAuditSnapshot(transaction, property, operationalDate);
      if (snapshot.blockerCount > 0) {
        throw new PartnerNightAuditError(
          'NIGHT_AUDIT_BLOCKED',
          'Resolve every blocking checklist item before closing this operational date.',
        );
      }
      const nextBusinessDate = nextOperationalDate(operationalDate);
      const advanced = await transaction.partnerProperty.updateMany({
        data: {
          operationalDate: nextBusinessDate,
          operationalDateVersion: { increment: 1 },
        },
        where: {
          id: property.id,
          operationalDate: property.operationalDate,
          operationalDateVersion: input.version,
        },
      });
      if (advanced.count !== 1) {
        throw new PartnerNightAuditError(
          'STALE_OPERATIONAL_DATE',
          'The operational date changed. Refresh before closing it.',
        );
      }
      const created = await transaction.hotelNightAuditClose.create({
        data: {
          businessDate: operationalDate,
          closeNote: close.note,
          closedByUserId: input.actorUserId,
          idempotencyKey,
          nextBusinessDate,
          partnerId: input.partnerId,
          propertyId: property.id,
          requestFingerprint,
          snapshotJson: JSON.stringify(snapshot),
        },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'HOTEL_OPERATIONAL_DATE_CLOSED',
          actorUserId: input.actorUserId,
          entityId: created.id,
          entityType: 'HOTEL_NIGHT_AUDIT_CLOSE',
          metadataJson: JSON.stringify({
            businessDate: operationalDate,
            nextBusinessDate,
            propertyId: property.id,
            snapshot,
          }),
          partnerId: input.partnerId,
          summary: `${property.displayName} operational date ${operationalDate} closed.`,
        },
      });
      return created;
    },
    { isolationLevel: 'Serializable' },
  );
}
