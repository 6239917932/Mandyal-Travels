export const ROOM_RACK_WINDOW_DAYS = 7;

export type RoomRackBooking = Readonly<{
  assignedRoomNumbers: readonly string[];
  checkInDate: string;
  checkOutDate: string;
  confirmationCode: string;
  guestName: string;
  operationalStatus: string;
}>;

export type RoomRackCell = Readonly<{
  booking?: RoomRackBooking;
  conflict: boolean;
  status: 'AVAILABLE' | 'CLEANING' | 'DIRTY' | 'OCCUPIED' | 'OUT_OF_SERVICE' | 'RESERVED';
}>;

type RoomRackRoom = Readonly<{
  housekeepingStatus: string;
  operationalStatus: string;
  roomNumber: string;
}>;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addRoomRackDays(value: string, days: number): string {
  if (!validIsoDate(value) || !Number.isInteger(days)) return '';
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildRoomRackDates(
  startDate: string,
  days: number = ROOM_RACK_WINDOW_DAYS,
): string[] {
  if (!validIsoDate(startDate) || !Number.isInteger(days) || days < 1 || days > 14) return [];
  return Array.from({ length: days }, (_, index) => addRoomRackDays(startDate, index));
}

export function readRoomRackAssignments(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter((entry) => /^[a-zA-Z0-9][a-zA-Z0-9 ._/-]{0,19}$/.test(entry)),
      ),
    ].slice(0, 100);
  } catch {
    return [];
  }
}

export function roomRackStayOverlapsDate(booking: RoomRackBooking, stayDate: string): boolean {
  return booking.checkInDate <= stayDate && booking.checkOutDate > stayDate;
}

export function resolveRoomRackCell(
  room: RoomRackRoom,
  bookings: readonly RoomRackBooking[],
  stayDate: string,
  operationalDate: string,
): RoomRackCell {
  const matchingBookings = bookings.filter(
    (booking) =>
      ['CHECKED_IN', 'RESERVED'].includes(booking.operationalStatus) &&
      booking.assignedRoomNumbers.includes(room.roomNumber) &&
      (roomRackStayOverlapsDate(booking, stayDate) ||
        (booking.operationalStatus === 'CHECKED_IN' && stayDate === operationalDate)),
  );
  const booking = matchingBookings[0];
  if (room.operationalStatus !== 'ACTIVE') {
    return {
      booking,
      conflict: Boolean(booking),
      status: 'OUT_OF_SERVICE',
    };
  }
  if (booking) {
    return {
      booking,
      conflict: matchingBookings.length > 1,
      status: booking.operationalStatus === 'CHECKED_IN' ? 'OCCUPIED' : 'RESERVED',
    };
  }

  if (stayDate === operationalDate && room.housekeepingStatus === 'DIRTY') {
    return { conflict: false, status: 'DIRTY' };
  }
  if (stayDate === operationalDate && room.housekeepingStatus === 'CLEANING') {
    return { conflict: false, status: 'CLEANING' };
  }
  return { conflict: false, status: 'AVAILABLE' };
}
