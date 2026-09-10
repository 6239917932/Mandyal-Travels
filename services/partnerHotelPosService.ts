import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { hotelFolioRequestFingerprint } from '@/lib/pms/folio';
import { resolveOperationalDate } from '@/lib/pms/operationalDate';
import {
  HOTEL_GUEST_SERVICE_MODES,
  HOTEL_POS_SERVICE_MODES,
  type HotelGuestServiceMode,
  type HotelPosStatus,
  hotelPosFingerprint,
  nextHotelGuestServiceStatuses,
  nextHotelPosStatuses,
  normalizeHotelGuestServiceOrder,
  normalizeHotelGuestServiceTransition,
  normalizeHotelPosOrder,
  normalizeHotelPosTransition,
  parseStoredHotelPosItems,
  requireHotelPosIdempotencyKey,
} from '@/lib/pms/pointOfSale';
import { normalizeHotelBookingReference } from '@/services/customerHotelBookingDetailRules';

const MAX_PROPERTIES = 100;
const MAX_STAYS = 200;
const MAX_ORDERS = 200;
const MAX_EVENTS = 20;
type HotelServiceWorkflow = 'GUEST_SERVICES' | 'POS';

export class PartnerHotelPosError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function guestName(guest: { firstName: string; lastName: string } | null): string {
  return guest ? `${guest.firstName} ${guest.lastName}`.trim().slice(0, 100) : 'Primary guest';
}

function roomNumber(value: string): string {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0].slice(0, 40) : '';
  } catch {
    return '';
  }
}

async function ownedProperties(partnerId: string) {
  return prisma.partnerProperty.findMany({
    orderBy: { displayName: 'asc' },
    select: {
      displayName: true,
      hotelSlug: true,
      id: true,
      operationalDate: true,
      timezone: true,
    },
    take: MAX_PROPERTIES + 1,
    where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
}

async function getPartnerHotelServiceWorkspace(
  input: {
    partnerId: string;
    requestedPropertyId?: string;
  },
  workflow: HotelServiceWorkflow,
) {
  const storedProperties = await ownedProperties(input.partnerId);
  const properties = storedProperties.slice(0, MAX_PROPERTIES);
  const selected =
    properties.find((property) => property.id === input.requestedPropertyId) ?? properties[0];
  if (!selected) {
    return {
      orders: [],
      properties: [],
      safetyLimitReached: storedProperties.length > MAX_PROPERTIES,
      stays: [],
    } as const;
  }
  const [storedStays, storedOrders] = await Promise.all([
    prisma.booking.findMany({
      include: { guest: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: MAX_STAYS + 1,
      where: {
        hotelSlug: selected.hotelSlug,
        operationalStatus: 'CHECKED_IN',
        status: 'confirmed',
      },
    }),
    prisma.hotelPosOrder.findMany({
      include: {
        booking: {
          include: { guest: { select: { firstName: true, lastName: true } } },
        },
        events: { orderBy: { createdAt: 'desc' }, take: MAX_EVENTS },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_ORDERS + 1,
      where: {
        partnerId: input.partnerId,
        propertyId: selected.id,
        serviceMode: {
          in: workflow === 'POS' ? [...HOTEL_POS_SERVICE_MODES] : [...HOTEL_GUEST_SERVICE_MODES],
        },
      },
    }),
  ]);
  const stays = storedStays.slice(0, MAX_STAYS);
  const orders = storedOrders.slice(0, MAX_ORDERS);
  return {
    businessDate: resolveOperationalDate(selected.operationalDate, selected.timezone),
    orders: orders.map((order) => ({
      confirmationCode: order.booking.confirmationCode,
      createdAt: order.createdAt.toISOString(),
      currency: order.currency,
      events: order.events.map((event) => ({
        createdAt: event.createdAt.toISOString(),
        fromStatus: event.fromStatus,
        note: event.note,
        toStatus: event.toStatus,
      })),
      folioEntryId: order.folioEntryId ?? undefined,
      guestName: guestName(order.booking.guest),
      id: order.id,
      items: parseStoredHotelPosItems(order.itemsJson),
      nextStatuses:
        workflow === 'POS'
          ? nextHotelPosStatuses(order.status as HotelPosStatus)
          : nextHotelGuestServiceStatuses(
              order.serviceMode as HotelGuestServiceMode,
              order.status as HotelPosStatus,
            ),
      note: order.note,
      outletName: order.outletName,
      roomNumber: order.roomNumber,
      serviceMode: order.serviceMode,
      status: order.status,
      totalAmount: order.totalAmount,
      version: order.version,
    })),
    properties: properties.map((property) => ({ id: property.id, name: property.displayName })),
    safetyLimitReached:
      storedProperties.length > MAX_PROPERTIES ||
      storedStays.length > MAX_STAYS ||
      storedOrders.length > MAX_ORDERS,
    selectedProperty: { id: selected.id, name: selected.displayName },
    stays: stays.map((stay) => ({
      confirmationCode: stay.confirmationCode,
      guestName: guestName(stay.guest),
      roomNumber: roomNumber(stay.assignedRoomNumbersJson),
    })),
  } as const;
}

export function getPartnerHotelPosWorkspace(input: {
  partnerId: string;
  requestedPropertyId?: string;
}) {
  return getPartnerHotelServiceWorkspace(input, 'POS');
}

export function getPartnerHotelGuestServiceWorkspace(input: {
  partnerId: string;
  requestedPropertyId?: string;
}) {
  return getPartnerHotelServiceWorkspace(input, 'GUEST_SERVICES');
}

async function createPartnerHotelServiceOrder(
  input: {
    actorUserId: string;
    confirmationCode: string;
    idempotencyKey: string;
    items?: unknown;
    note?: unknown;
    outletName?: unknown;
    partnerId: string;
    propertyId: string;
    serviceMode?: unknown;
  },
  workflow: HotelServiceWorkflow,
) {
  const idempotencyKey = requireHotelPosIdempotencyKey(input.idempotencyKey);
  const confirmationCode = normalizeHotelBookingReference(input.confirmationCode);
  if (!confirmationCode) {
    throw new PartnerHotelPosError('INVALID_BOOKING_REFERENCE', 'Choose a checked-in stay.');
  }
  const normalized =
    workflow === 'POS' ? normalizeHotelPosOrder(input) : normalizeHotelGuestServiceOrder(input);
  const requestFingerprint = hotelPosFingerprint({
    confirmationCode,
    items: normalized.items,
    note: normalized.note,
    outletName: normalized.outletName,
    partnerId: input.partnerId,
    propertyId: input.propertyId,
    serviceMode: normalized.serviceMode,
  });
  return prisma.$transaction(
    async (transaction) => {
      const existing = await transaction.hotelPosOrder.findUnique({
        where: { createIdempotencyKey: idempotencyKey },
      });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new PartnerHotelPosError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key is already connected to another order.',
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
        throw new PartnerHotelPosError(
          'PROPERTY_NOT_FOUND',
          'Choose an active managed property assigned to this partner.',
        );
      }
      const booking = await transaction.booking.findFirst({
        where: {
          confirmationCode,
          hotelSlug: property.hotelSlug,
          operationalStatus: 'CHECKED_IN',
          status: 'confirmed',
        },
      });
      if (!booking) {
        throw new PartnerHotelPosError(
          'STAY_NOT_FOUND',
          'Only a currently checked-in stay can receive an order.',
        );
      }
      const assignedRoom = roomNumber(booking.assignedRoomNumbersJson);
      if (normalized.serviceMode !== 'OUTLET' && !assignedRoom) {
        throw new PartnerHotelPosError(
          'ROOM_ASSIGNMENT_REQUIRED',
          'Assign a physical room before placing this guest-service order.',
        );
      }
      const order = await transaction.hotelPosOrder.create({
        data: {
          bookingId: booking.id,
          businessDate: resolveOperationalDate(property.operationalDate, property.timezone),
          createIdempotencyKey: idempotencyKey,
          createdByUserId: input.actorUserId,
          currency: booking.currency,
          itemsJson: JSON.stringify(normalized.items),
          note: normalized.note,
          outletName: normalized.outletName,
          partnerId: input.partnerId,
          propertyId: property.id,
          requestFingerprint,
          roomNumber: assignedRoom,
          serviceMode: normalized.serviceMode,
          totalAmount: normalized.totalAmount,
        },
      });
      await transaction.hotelPosOrderEvent.create({
        data: {
          action: 'CREATE',
          actorUserId: input.actorUserId,
          fromStatus: 'NONE',
          idempotencyKey,
          orderId: order.id,
          requestFingerprint,
          toStatus: 'PLACED',
          version: 1,
        },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action:
            workflow === 'POS' ? 'HOTEL_POS_ORDER_PLACED' : 'HOTEL_GUEST_SERVICE_ORDER_PLACED',
          actorUserId: input.actorUserId,
          entityId: order.id,
          entityType: 'HOTEL_POS_ORDER',
          metadataJson: JSON.stringify({
            businessDate: order.businessDate,
            confirmationCode,
            propertyId: property.id,
            serviceMode: order.serviceMode,
            totalAmount: order.totalAmount,
          }),
          partnerId: input.partnerId,
          summary: `${order.serviceMode.replaceAll('_', ' ').toLowerCase()} order placed for ${confirmationCode}.`,
        },
      });
      return order;
    },
    { isolationLevel: 'Serializable' },
  );
}

type CreatePartnerHotelServiceOrderInput = Parameters<typeof createPartnerHotelServiceOrder>[0];

export function createPartnerHotelPosOrder(input: CreatePartnerHotelServiceOrderInput) {
  return createPartnerHotelServiceOrder(input, 'POS');
}

export function createPartnerHotelGuestServiceOrder(input: CreatePartnerHotelServiceOrderInput) {
  return createPartnerHotelServiceOrder(input, 'GUEST_SERVICES');
}

async function transitionPartnerHotelServiceOrder(
  input: {
    actorUserId: string;
    idempotencyKey: string;
    note?: unknown;
    orderId: string;
    partnerId: string;
    targetStatus?: unknown;
    version: number;
  },
  workflow: HotelServiceWorkflow,
) {
  const idempotencyKey = requireHotelPosIdempotencyKey(input.idempotencyKey);
  if (!Number.isSafeInteger(input.version) || input.version < 1) {
    throw new PartnerHotelPosError('STALE_ORDER', 'Refresh the order and try again.');
  }
  return prisma.$transaction(
    async (transaction) => {
      const existingEvent = await transaction.hotelPosOrderEvent.findUnique({
        where: { idempotencyKey },
      });
      const requestFingerprint = hotelPosFingerprint({
        note:
          typeof input.note === 'string'
            ? input.note.trim().replace(/\s+/g, ' ').slice(0, 240)
            : '',
        orderId: input.orderId,
        partnerId: input.partnerId,
        targetStatus: String(input.targetStatus ?? '')
          .trim()
          .toUpperCase(),
        version: input.version,
      });
      if (existingEvent) {
        if (existingEvent.requestFingerprint !== requestFingerprint) {
          throw new PartnerHotelPosError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key is already connected to another order action.',
          );
        }
        const existingOrder = await transaction.hotelPosOrder.findFirst({
          where: { id: existingEvent.orderId, partnerId: input.partnerId },
        });
        const allowedModes =
          workflow === 'POS' ? HOTEL_POS_SERVICE_MODES : HOTEL_GUEST_SERVICE_MODES;
        if (!existingOrder || !allowedModes.some((mode) => mode === existingOrder.serviceMode)) {
          throw new PartnerHotelPosError('ORDER_NOT_FOUND', 'The order was not found.');
        }
        return existingOrder;
      }
      const order = await transaction.hotelPosOrder.findFirst({
        include: { booking: true, property: true },
        where: { id: input.orderId, partnerId: input.partnerId },
      });
      if (!order) throw new PartnerHotelPosError('ORDER_NOT_FOUND', 'The order was not found.');
      const allowedModes = workflow === 'POS' ? HOTEL_POS_SERVICE_MODES : HOTEL_GUEST_SERVICE_MODES;
      if (!allowedModes.some((mode) => mode === order.serviceMode)) {
        throw new PartnerHotelPosError('ORDER_NOT_FOUND', 'The order was not found.');
      }
      if (order.version !== input.version) {
        throw new PartnerHotelPosError('STALE_ORDER', 'This order changed. Refresh and try again.');
      }
      const transition =
        workflow === 'POS'
          ? normalizeHotelPosTransition({
              currentStatus: order.status,
              note: input.note,
              targetStatus: input.targetStatus,
            })
          : normalizeHotelGuestServiceTransition({
              currentStatus: order.status,
              note: input.note,
              serviceMode: order.serviceMode as HotelGuestServiceMode,
              targetStatus: input.targetStatus,
            });
      if (
        order.property.listingSource !== 'MANAGED' ||
        order.property.partnerId !== input.partnerId ||
        order.property.status !== 'ACTIVE'
      ) {
        throw new PartnerHotelPosError(
          'PROPERTY_NOT_FOUND',
          'This order is not connected to an active managed property.',
        );
      }
      if (
        transition.targetStatus !== 'CANCELLED' &&
        order.booking.operationalStatus !== 'CHECKED_IN'
      ) {
        throw new PartnerHotelPosError(
          'STAY_NOT_ACTIVE',
          'The linked stay is no longer checked in. Cancel the order instead.',
        );
      }
      let folioEntryId: string | undefined;
      if (transition.targetStatus === 'POSTED') {
        const folioCategory =
          order.serviceMode === 'ROOM_SERVICE'
            ? 'ROOM_SERVICE'
            : order.serviceMode === 'LAUNDRY'
              ? 'LAUNDRY'
              : order.serviceMode === 'MINIBAR'
                ? 'MINIBAR'
                : order.serviceMode === 'SPA'
                  ? 'SPA'
                  : 'FOOD_AND_BEVERAGE';
        const folioIdempotencyKey = `service_${hotelPosFingerprint({ idempotencyKey, orderId: order.id }).slice(0, 56)}`;
        const folioFingerprint = hotelFolioRequestFingerprint({
          amount: order.totalAmount,
          category: folioCategory,
          orderId: order.id,
        });
        const folioEntry = await transaction.hotelFolioEntry.create({
          data: {
            amount: order.totalAmount,
            bookingId: order.bookingId,
            businessDate: order.businessDate,
            category: folioCategory,
            currency: order.currency,
            description: `${order.outletName} order ${order.id.slice(-8)}`.slice(0, 160),
            entryType: 'CHARGE',
            idempotencyKey: folioIdempotencyKey,
            postedByUserId: input.actorUserId,
            requestFingerprint: folioFingerprint,
          },
        });
        folioEntryId = folioEntry.id;
      }
      const updated = await transaction.hotelPosOrder.updateMany({
        data: {
          ...(folioEntryId ? { folioEntryId } : {}),
          status: transition.targetStatus,
          version: { increment: 1 },
        },
        where: { id: order.id, partnerId: input.partnerId, version: input.version },
      });
      if (updated.count !== 1) {
        throw new PartnerHotelPosError('STALE_ORDER', 'This order changed. Refresh and try again.');
      }
      await transaction.hotelPosOrderEvent.create({
        data: {
          action: transition.targetStatus === 'POSTED' ? 'POST_TO_FOLIO' : 'TRANSITION',
          actorUserId: input.actorUserId,
          fromStatus: order.status,
          idempotencyKey,
          note: transition.note,
          orderId: order.id,
          requestFingerprint,
          toStatus: transition.targetStatus,
          version: order.version + 1,
        },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: `${workflow === 'POS' ? 'HOTEL_POS_ORDER' : 'HOTEL_GUEST_SERVICE_ORDER'}_${transition.targetStatus}`,
          actorUserId: input.actorUserId,
          entityId: order.id,
          entityType: 'HOTEL_POS_ORDER',
          metadataJson: JSON.stringify({
            confirmationCode: order.booking.confirmationCode,
            folioEntryId,
            fromStatus: order.status,
            propertyId: order.propertyId,
            toStatus: transition.targetStatus,
            totalAmount: order.totalAmount,
          }),
          partnerId: input.partnerId,
          summary: `${order.property.displayName} order moved to ${transition.targetStatus.toLowerCase()}.`,
        },
      });
      return {
        ...order,
        folioEntryId,
        status: transition.targetStatus,
        version: order.version + 1,
      };
    },
    { isolationLevel: 'Serializable' },
  );
}

type TransitionPartnerHotelServiceOrderInput = Parameters<
  typeof transitionPartnerHotelServiceOrder
>[0];

export function transitionPartnerHotelPosOrder(input: TransitionPartnerHotelServiceOrderInput) {
  return transitionPartnerHotelServiceOrder(input, 'POS');
}

export function transitionPartnerHotelGuestServiceOrder(
  input: TransitionPartnerHotelServiceOrderInput,
) {
  return transitionPartnerHotelServiceOrder(input, 'GUEST_SERVICES');
}

export async function assertNoOpenHotelServiceOrdersForCheckout(
  transaction: Prisma.TransactionClient,
  bookingId: string,
) {
  const activeOrders = await transaction.hotelPosOrder.count({
    where: {
      bookingId,
      status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'] },
    },
  });
  if (activeOrders > 0) {
    throw new PartnerHotelPosError(
      'OPEN_SERVICE_ORDERS',
      'Post or cancel every open room-service, outlet, laundry, minibar, and spa order before checkout.',
    );
  }
}
