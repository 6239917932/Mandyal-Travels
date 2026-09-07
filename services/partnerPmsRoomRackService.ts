import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  addRoomRackDays,
  buildRoomRackDates,
  readRoomRackAssignments,
  resolveRoomRackCell,
  type RoomRackBooking,
} from '@/lib/pms/roomRack';

const MAX_RACK_PROPERTIES = 100;
const MAX_RACK_ROOMS = 5_000;
const MAX_RACK_BOOKINGS = 5_000;

export type PartnerRoomRackProperty = Readonly<{
  id: string;
  name: string;
}>;

export type PartnerRoomRackRow = Readonly<{
  cells: readonly ReturnType<typeof resolveRoomRackCell>[];
  floorLabel: string;
  housekeepingStatus: string;
  operationalStatus: string;
  roomNumber: string;
  roomTypeName: string;
}>;

export type PartnerRoomRackQueueItem = Readonly<{
  assignedRoomNumbers: readonly string[];
  confirmationCode: string;
  guestName: string;
  rooms: number;
}>;

export type PartnerRoomRack = Readonly<{
  arrivals: readonly PartnerRoomRackQueueItem[];
  conflictCount: number;
  dates: readonly string[];
  departures: readonly PartnerRoomRackQueueItem[];
  occupiedRoomCount: number;
  operationalDate: string;
  properties: readonly PartnerRoomRackProperty[];
  readyRoomCount: number;
  rooms: readonly PartnerRoomRackRow[];
  selectedProperty?: PartnerRoomRackProperty;
  safetyLimitReached: boolean;
  unassignedArrivalCount: number;
}>;

function dateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function guestName(guest: { firstName: string; lastName: string } | null): string {
  if (!guest) return 'Guest details unavailable';
  return `${guest.firstName} ${guest.lastName}`.trim().slice(0, 100) || 'Guest details unavailable';
}

export async function getPartnerPmsRoomRack(
  partnerId: string,
  requestedPropertyId?: string,
): Promise<PartnerRoomRack> {
  const ownedProperties = await prisma.partnerProperty.findMany({
    orderBy: { displayName: 'asc' },
    select: { displayName: true, hotelSlug: true, id: true, timezone: true },
    take: MAX_RACK_PROPERTIES + 1,
    where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
  const boundedProperties = ownedProperties.slice(0, MAX_RACK_PROPERTIES);
  const properties = boundedProperties.map((property) => ({
    id: property.id,
    name: property.displayName,
  }));
  const selected =
    boundedProperties.find((property) => property.id === requestedPropertyId) ??
    boundedProperties[0];
  if (!selected) {
    return {
      arrivals: [],
      conflictCount: 0,
      dates: [],
      departures: [],
      occupiedRoomCount: 0,
      operationalDate: dateInTimezone('Asia/Kolkata'),
      properties,
      readyRoomCount: 0,
      rooms: [],
      safetyLimitReached: ownedProperties.length > MAX_RACK_PROPERTIES,
      unassignedArrivalCount: 0,
    };
  }

  const operationalDate = dateInTimezone(selected.timezone);
  const dates = buildRoomRackDates(operationalDate);
  const endExclusive = addRoomRackDays(operationalDate, dates.length);
  const [physicalRooms, storedBookings] = await Promise.all([
    prisma.partnerPhysicalRoom.findMany({
      include: { roomType: { select: { name: true } } },
      orderBy: [{ floorLabel: 'asc' }, { roomNumber: 'asc' }],
      take: MAX_RACK_ROOMS + 1,
      where: { propertyId: selected.id },
    }),
    prisma.booking.findMany({
      orderBy: [{ quote: { checkInDate: 'asc' } }, { createdAt: 'asc' }],
      select: {
        assignedRoomNumbersJson: true,
        confirmationCode: true,
        guest: { select: { firstName: true, lastName: true } },
        operationalStatus: true,
        quote: { select: { checkInDate: true, checkOutDate: true, rooms: true } },
      },
      take: MAX_RACK_BOOKINGS + 1,
      where: {
        hotelSlug: selected.hotelSlug,
        operationalStatus: { in: ['RESERVED', 'CHECKED_IN'] },
        quote: { checkInDate: { lt: endExclusive }, checkOutDate: { gte: operationalDate } },
        status: 'confirmed',
      },
    }),
  ]);
  const boundedRooms = physicalRooms.slice(0, MAX_RACK_ROOMS);
  const boundedBookings = storedBookings.slice(0, MAX_RACK_BOOKINGS);
  const bookings: (RoomRackBooking & { rooms: number })[] = boundedBookings.map((booking) => ({
    assignedRoomNumbers: readRoomRackAssignments(booking.assignedRoomNumbersJson),
    checkInDate: booking.quote.checkInDate,
    checkOutDate: booking.quote.checkOutDate,
    confirmationCode: booking.confirmationCode,
    guestName: guestName(booking.guest),
    operationalStatus: booking.operationalStatus,
    rooms: booking.quote.rooms,
  }));
  const rooms = boundedRooms.map((room) => ({
    cells: dates.map((stayDate) => resolveRoomRackCell(room, bookings, stayDate, operationalDate)),
    floorLabel: room.floorLabel,
    housekeepingStatus: room.housekeepingStatus,
    operationalStatus: room.operationalStatus,
    roomNumber: room.roomNumber,
    roomTypeName: room.roomType.name,
  }));
  const queueItem = (booking: (typeof bookings)[number]): PartnerRoomRackQueueItem => ({
    assignedRoomNumbers: booking.assignedRoomNumbers,
    confirmationCode: booking.confirmationCode,
    guestName: booking.guestName,
    rooms: booking.rooms,
  });
  const arrivals = bookings
    .filter(
      (booking) =>
        booking.operationalStatus === 'RESERVED' && booking.checkInDate === operationalDate,
    )
    .map(queueItem);
  const departures = bookings
    .filter(
      (booking) =>
        booking.operationalStatus === 'CHECKED_IN' && booking.checkOutDate === operationalDate,
    )
    .map(queueItem);
  const todayCells = rooms.map((room) => room.cells[0]).filter(Boolean);

  return {
    arrivals,
    conflictCount: rooms.flatMap((room) => room.cells).filter((cell) => cell.conflict).length,
    dates,
    departures,
    occupiedRoomCount: todayCells.filter((cell) => cell.status === 'OCCUPIED').length,
    operationalDate,
    properties,
    readyRoomCount: boundedRooms.filter(
      (room) => room.operationalStatus === 'ACTIVE' && room.housekeepingStatus === 'READY',
    ).length,
    rooms,
    safetyLimitReached:
      ownedProperties.length > MAX_RACK_PROPERTIES ||
      physicalRooms.length > MAX_RACK_ROOMS ||
      storedBookings.length > MAX_RACK_BOOKINGS,
    selectedProperty: { id: selected.id, name: selected.displayName },
    unassignedArrivalCount: arrivals.filter((arrival) => !arrival.assignedRoomNumbers.length)
      .length,
  };
}
