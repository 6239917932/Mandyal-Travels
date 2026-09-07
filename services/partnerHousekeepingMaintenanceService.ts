import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  HotelRoomOperationRuleError,
  normalizeHousekeepingInspection,
  normalizeMaintenanceTransition,
  normalizeMaintenanceWorkOrder,
  requireRoomOperationIdempotencyKey,
  roomOperationFingerprint,
} from '@/lib/pms/housekeepingMaintenance';

const MAX_ROOMS = 500;
const MAX_WORK_ORDERS = 300;
const MAX_INSPECTIONS_PER_ROOM = 5;

export class PartnerRoomOperationsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function dateInTimezone(timezone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function requireManagedRoom(
  transaction: Prisma.TransactionClient,
  input: { partnerId: string; physicalRoomId: string },
) {
  const room = await transaction.partnerPhysicalRoom.findFirst({
    include: { property: true, roomType: true },
    where: {
      id: input.physicalRoomId,
      property: { listingSource: 'MANAGED', partnerId: input.partnerId, status: 'ACTIVE' },
    },
  });
  if (!room) {
    throw new PartnerRoomOperationsError(
      'PHYSICAL_ROOM_NOT_FOUND',
      'Choose an active physical room assigned to this hotel partner.',
    );
  }
  return room;
}

export async function getPartnerRoomOperationsWorkspace(partnerId: string) {
  const [rooms, workOrders] = await Promise.all([
    prisma.partnerPhysicalRoom.findMany({
      include: {
        housekeepingInspections: {
          orderBy: { inspectedAt: 'desc' },
          take: MAX_INSPECTIONS_PER_ROOM,
        },
        property: { select: { displayName: true } },
        roomType: { select: { name: true } },
      },
      orderBy: [{ property: { displayName: 'asc' } }, { roomNumber: 'asc' }],
      take: MAX_ROOMS + 1,
      where: {
        property: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
      },
    }),
    prisma.hotelMaintenanceWorkOrder.findMany({
      include: {
        events: { orderBy: { version: 'desc' }, take: 5 },
        physicalRoom: { select: { roomNumber: true } },
        property: { select: { displayName: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: MAX_WORK_ORDERS + 1,
      where: { partnerId },
    }),
  ]);
  return {
    rooms: rooms.slice(0, MAX_ROOMS),
    safetyLimitReached: rooms.length > MAX_ROOMS || workOrders.length > MAX_WORK_ORDERS,
    workOrders: workOrders.slice(0, MAX_WORK_ORDERS),
  } as const;
}

export async function recordHousekeepingInspection(input: {
  actorUserId: string;
  idempotencyKey: string;
  note?: unknown;
  partnerId: string;
  physicalRoomId: string;
  result?: unknown;
}) {
  const inspection = normalizeHousekeepingInspection(input);
  const idempotencyKey = requireRoomOperationIdempotencyKey(input.idempotencyKey);
  const requestFingerprint = roomOperationFingerprint({
    inspection,
    partnerId: input.partnerId,
    physicalRoomId: input.physicalRoomId,
  });
  return prisma.$transaction(
    async (transaction) => {
      const existing = await transaction.hotelHousekeepingInspection.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new PartnerRoomOperationsError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key is already connected to another room inspection.',
          );
        }
        return existing;
      }
      const room = await requireManagedRoom(transaction, input);
      const unresolvedOrders = await transaction.hotelMaintenanceWorkOrder.count({
        where: { physicalRoomId: room.id, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      });
      const created = await transaction.hotelHousekeepingInspection.create({
        data: {
          businessDate: dateInTimezone(room.property.timezone),
          idempotencyKey,
          inspectedByUserId: input.actorUserId,
          note: inspection.note,
          partnerId: input.partnerId,
          physicalRoomId: room.id,
          propertyId: room.propertyId,
          requestFingerprint,
          result: inspection.result,
        },
      });
      await transaction.partnerPhysicalRoom.update({
        data: {
          housekeepingStatus:
            inspection.result === 'PASSED' && unresolvedOrders === 0 ? 'READY' : 'DIRTY',
        },
        where: { id: room.id },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'HOTEL_ROOM_INSPECTED',
          actorUserId: input.actorUserId,
          entityId: created.id,
          entityType: 'HOTEL_HOUSEKEEPING_INSPECTION',
          metadataJson: JSON.stringify({
            physicalRoomId: room.id,
            propertyId: room.propertyId,
            result: inspection.result,
          }),
          partnerId: input.partnerId,
          summary: `Room ${room.roomNumber} inspection ${inspection.result.toLowerCase()}.`,
        },
      });
      return created;
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function createMaintenanceWorkOrder(input: {
  actorUserId: string;
  category?: unknown;
  description?: unknown;
  idempotencyKey: string;
  partnerId: string;
  physicalRoomId: string;
  priority?: unknown;
  summary?: unknown;
}) {
  const work = normalizeMaintenanceWorkOrder(input);
  const idempotencyKey = requireRoomOperationIdempotencyKey(input.idempotencyKey);
  const requestFingerprint = roomOperationFingerprint({
    partnerId: input.partnerId,
    physicalRoomId: input.physicalRoomId,
    work,
  });
  return prisma.$transaction(
    async (transaction) => {
      const existing = await transaction.hotelMaintenanceWorkOrder.findUnique({
        where: { createIdempotencyKey: idempotencyKey },
      });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new PartnerRoomOperationsError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key is already connected to another maintenance request.',
          );
        }
        return existing;
      }
      const room = await requireManagedRoom(transaction, input);
      const created = await transaction.hotelMaintenanceWorkOrder.create({
        data: {
          ...work,
          createIdempotencyKey: idempotencyKey,
          events: {
            create: {
              action: 'OPENED',
              actorUserId: input.actorUserId,
              fromStatus: '',
              note: work.description,
              toStatus: 'OPEN',
              version: 1,
            },
          },
          openedByUserId: input.actorUserId,
          partnerId: input.partnerId,
          physicalRoomId: room.id,
          propertyId: room.propertyId,
          requestFingerprint,
        },
      });
      await transaction.partnerPhysicalRoom.update({
        data: { operationalStatus: 'OUT_OF_SERVICE' },
        where: { id: room.id },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'HOTEL_MAINTENANCE_WORK_ORDER_OPENED',
          actorUserId: input.actorUserId,
          entityId: created.id,
          entityType: 'HOTEL_MAINTENANCE_WORK_ORDER',
          metadataJson: JSON.stringify({
            category: work.category,
            physicalRoomId: room.id,
            priority: work.priority,
            propertyId: room.propertyId,
          }),
          partnerId: input.partnerId,
          summary: `Maintenance opened for room ${room.roomNumber}: ${work.summary}`,
        },
      });
      return created;
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function transitionMaintenanceWorkOrder(input: {
  actorUserId: string;
  nextStatus?: unknown;
  note?: unknown;
  partnerId: string;
  version: number;
  workOrderId: string;
}) {
  return prisma.$transaction(
    async (transaction) => {
      const current = await transaction.hotelMaintenanceWorkOrder.findFirst({
        include: { physicalRoom: { select: { roomNumber: true } } },
        where: { id: input.workOrderId, partnerId: input.partnerId },
      });
      if (!current) {
        throw new PartnerRoomOperationsError(
          'WORK_ORDER_NOT_FOUND',
          'The work order was not found.',
        );
      }
      if (!Number.isSafeInteger(input.version) || input.version !== current.version) {
        throw new PartnerRoomOperationsError(
          'WORK_ORDER_CHANGED',
          'This work order changed. Refresh the page and try again.',
        );
      }
      const transition = normalizeMaintenanceTransition({
        currentStatus: current.status,
        nextStatus: input.nextStatus,
        note: input.note,
      });
      const nextVersion = current.version + 1;
      const updated = await transaction.hotelMaintenanceWorkOrder.update({
        data: {
          events: {
            create: {
              action: `STATUS_${transition.nextStatus}`,
              actorUserId: input.actorUserId,
              fromStatus: current.status,
              note: transition.note,
              toStatus: transition.nextStatus,
              version: nextVersion,
            },
          },
          resolvedAt: transition.nextStatus === 'RESOLVED' ? new Date() : null,
          status: transition.nextStatus,
          version: nextVersion,
        },
        where: { id: current.id, version: current.version },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'HOTEL_MAINTENANCE_WORK_ORDER_UPDATED',
          actorUserId: input.actorUserId,
          entityId: updated.id,
          entityType: 'HOTEL_MAINTENANCE_WORK_ORDER',
          metadataJson: JSON.stringify({
            fromStatus: current.status,
            physicalRoomId: current.physicalRoomId,
            toStatus: transition.nextStatus,
            version: nextVersion,
          }),
          partnerId: input.partnerId,
          summary: `Room ${current.physicalRoom.roomNumber} maintenance moved to ${transition.nextStatus.toLowerCase().replaceAll('_', ' ')}.`,
        },
      });
      return updated;
    },
    { isolationLevel: 'Serializable' },
  );
}

export { HotelRoomOperationRuleError };
