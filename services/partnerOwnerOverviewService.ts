import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  buildOwnerSourceMix,
  calculateOwnerDailyPerformance,
  calculateOwnerFinancialTotals,
  type OwnerOverviewBooking,
} from '@/lib/pms/ownerOverview';
import { resolveOperationalDate } from '@/lib/pms/operationalDate';

const DAY_MS = 86_400_000;
const MAX_PROPERTIES = 100;
const MAX_ROOMS = 1_000;
const MAX_BOOKINGS = 2_000;
const MAX_ENTRIES_PER_BOOKING = 250;

export class PartnerOwnerOverviewError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function addDays(value: string, days: number): string {
  return new Date(Date.parse(`${value}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function balanceEntries(
  entries: Array<{ amount: number; entryType: string; reversalOf: { entryType: string } | null }>,
) {
  return entries.map((entry) => ({
    amount: entry.amount,
    entryType: entry.entryType as 'CHARGE' | 'PAYMENT' | 'REVERSAL',
    reversalOfType: entry.reversalOf?.entryType as 'CHARGE' | 'PAYMENT' | undefined,
  }));
}

export async function getPartnerOwnerOverview(input: {
  memberRole?: string;
  partnerId: string;
  requestedPropertyId?: string;
}) {
  if (input.memberRole !== 'ADMIN') {
    throw new PartnerOwnerOverviewError(
      'OWNER_ACCESS_REQUIRED',
      'A hotel partner administrator is required to view owner financial totals.',
    );
  }
  const partnerId = input.partnerId;
  const requestedPropertyId = input.requestedPropertyId;
  const properties = await prisma.partnerProperty.findMany({
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
  const boundedProperties = properties.slice(0, MAX_PROPERTIES);
  const selectedProperty =
    boundedProperties.find((property) => property.id === requestedPropertyId) ??
    boundedProperties[0];
  if (!selectedProperty) {
    return {
      properties: [],
      safetyLimitReached: properties.length > MAX_PROPERTIES,
      selectedProperty: undefined,
    } as const;
  }

  const businessDate = resolveOperationalDate(
    selectedProperty.operationalDate,
    selectedProperty.timezone,
  );
  const windowDates = Array.from({ length: 7 }, (_, index) => addDays(businessDate, index - 6));
  const [rooms, bookings, openCashierShifts, pendingAmendments, activeMaintenance, recentCloses] =
    await Promise.all([
      prisma.partnerPhysicalRoom.findMany({
        select: { housekeepingStatus: true, operationalStatus: true },
        take: MAX_ROOMS + 1,
        where: { propertyId: selectedProperty.id },
      }),
      prisma.booking.findMany({
        include: {
          folioEntries: {
            include: { reversalOf: { select: { entryType: true } } },
            orderBy: { createdAt: 'asc' },
            take: MAX_ENTRIES_PER_BOOKING + 1,
          },
          payment: { select: { amount: true, status: true } },
          quote: {
            select: { checkInDate: true, checkOutDate: true, rooms: true },
          },
          refunds: { select: { amount: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_BOOKINGS + 1,
        where: {
          hotelSlug: selectedProperty.hotelSlug,
          operationalStatus: { not: 'NO_SHOW' },
          status: 'confirmed',
        },
      }),
      prisma.hotelCashierShift.count({
        where: { propertyId: selectedProperty.id, status: 'OPEN' },
      }),
      prisma.bookingAmendment.count({
        where: {
          booking: { hotelSlug: selectedProperty.hotelSlug },
          status: 'pending',
        },
      }),
      prisma.hotelMaintenanceWorkOrder.count({
        where: { propertyId: selectedProperty.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      prisma.hotelNightAuditClose.findMany({
        orderBy: { closedAt: 'desc' },
        select: { businessDate: true, closedAt: true, nextBusinessDate: true },
        take: 7,
        where: { propertyId: selectedProperty.id },
      }),
    ]);

  const boundedRooms = rooms.slice(0, MAX_ROOMS);
  const boundedBookings = bookings.slice(0, MAX_BOOKINGS);
  const bookingEntryLimitReached = boundedBookings.some(
    (booking) => booking.folioEntries.length > MAX_ENTRIES_PER_BOOKING,
  );
  const safetyLimitReached =
    properties.length > MAX_PROPERTIES ||
    rooms.length > MAX_ROOMS ||
    bookings.length > MAX_BOOKINGS ||
    bookingEntryLimitReached;
  const financialBookings: OwnerOverviewBooking[] = boundedBookings.map((booking) => ({
    checkInDate: booking.quote.checkInDate,
    checkOutDate: booking.quote.checkOutDate,
    currency: booking.currency,
    entries: balanceEntries(booking.folioEntries.slice(0, MAX_ENTRIES_PER_BOOKING)),
    onlinePayment: booking.payment,
    onlineRefunds: booking.refunds,
    rooms: booking.quote.rooms,
    source: booking.source,
    totalAmount: booking.totalAmount,
  }));
  const currencies = [
    ...new Set(financialBookings.map((booking) => booking.currency.trim().toUpperCase())),
  ];
  const currencyConflict =
    currencies.length > 1 || currencies.some((value) => !/^[A-Z]{3}$/.test(value));
  const activeRooms = boundedRooms.filter((room) => room.operationalStatus === 'ACTIVE').length;
  const dirtyRooms = boundedRooms.filter((room) => room.housekeepingStatus === 'DIRTY').length;
  const readyRooms = boundedRooms.filter(
    (room) => room.operationalStatus === 'ACTIVE' && room.housekeepingStatus === 'READY',
  ).length;
  const today = calculateOwnerDailyPerformance({
    activeRooms,
    bookings: financialBookings,
    businessDate,
  });
  const arrivals = boundedBookings.reduce(
    (total, booking) =>
      total + (booking.quote.checkInDate === businessDate ? booking.quote.rooms : 0),
    0,
  );
  const departures = boundedBookings.reduce(
    (total, booking) =>
      total + (booking.quote.checkOutDate === businessDate ? booking.quote.rooms : 0),
    0,
  );

  return {
    businessDate,
    currency: currencies.length === 1 ? currencies[0] : 'INR',
    financialComplete: !safetyLimitReached && !currencyConflict,
    financials: calculateOwnerFinancialTotals(financialBookings),
    operations: {
      activeMaintenance,
      arrivals,
      departures,
      dirtyRooms,
      openCashierShifts,
      pendingAmendments,
      readyRooms,
      totalRooms: boundedRooms.length,
    },
    performance: today,
    performanceWindow: windowDates.map((date) => ({
      businessDate: date,
      ...calculateOwnerDailyPerformance({
        activeRooms,
        bookings: financialBookings,
        businessDate: date,
      }),
    })),
    properties: boundedProperties.map((property) => ({
      id: property.id,
      name: property.displayName,
    })),
    recentCloses: recentCloses.map((close) => ({
      businessDate: close.businessDate,
      closedAt: close.closedAt.toISOString(),
      nextBusinessDate: close.nextBusinessDate,
    })),
    safetyLimitReached,
    selectedProperty: {
      id: selectedProperty.id,
      name: selectedProperty.displayName,
    },
    sourceMix: buildOwnerSourceMix(financialBookings),
    currencyConflict,
  } as const;
}
