import { addRoomRackDays, readRoomRackAssignments } from './roomRack.ts';

export const CENTRAL_RESERVATION_WINDOW_DAYS = 14;

export type CentralReservationProperty = Readonly<{
  id: string;
  name: string;
  operationalDate: string;
  slug: string;
}>;

export type CentralReservationBooking = Readonly<{
  assignedRoomNumbersJson: string;
  checkInDate: string;
  checkOutDate: string;
  confirmationCode: string;
  guestName: string;
  hotelSlug: string;
  operationalStatus: string;
  rooms: number;
  source: string;
  status: string;
}>;

export type CentralReservationPropertySummary = Readonly<{
  activeReservations: number;
  arrivalsToday: number;
  departuresToday: number;
  id: string;
  inHouse: number;
  name: string;
  operationalDate: string;
  unassignedArrivals: number;
}>;

export type CentralReservationArrival = Readonly<{
  assignedRoomNumbers: readonly string[];
  checkInDate: string;
  confirmationCode: string;
  guestName: string;
  propertyName: string;
  rooms: number;
  source: string;
}>;

export function buildCentralReservationProjection(
  properties: readonly CentralReservationProperty[],
  bookings: readonly CentralReservationBooking[],
) {
  const propertyBySlug = new Map(properties.map((property) => [property.slug, property]));
  const activeBookings = bookings.filter(
    (booking) =>
      propertyBySlug.has(booking.hotelSlug) &&
      booking.status === 'confirmed' &&
      ['RESERVED', 'CHECKED_IN'].includes(booking.operationalStatus),
  );
  const summaries: CentralReservationPropertySummary[] = properties.map((property) => {
    const owned = activeBookings.filter((booking) => booking.hotelSlug === property.slug);
    return {
      activeReservations: owned.length,
      arrivalsToday: owned
        .filter((booking) => booking.checkInDate === property.operationalDate)
        .reduce((total, booking) => total + booking.rooms, 0),
      departuresToday: owned
        .filter((booking) => booking.checkOutDate === property.operationalDate)
        .reduce((total, booking) => total + booking.rooms, 0),
      id: property.id,
      inHouse: owned
        .filter((booking) => booking.operationalStatus === 'CHECKED_IN')
        .reduce((total, booking) => total + booking.rooms, 0),
      name: property.name,
      operationalDate: property.operationalDate,
      unassignedArrivals: owned.filter(
        (booking) =>
          booking.operationalStatus === 'RESERVED' &&
          booking.checkInDate === property.operationalDate &&
          readRoomRackAssignments(booking.assignedRoomNumbersJson).length < booking.rooms,
      ).length,
    };
  });
  const arrivals: CentralReservationArrival[] = activeBookings
    .filter((booking) => {
      const property = propertyBySlug.get(booking.hotelSlug);
      if (!property || booking.operationalStatus !== 'RESERVED') return false;
      return (
        booking.checkInDate >= property.operationalDate &&
        booking.checkInDate <=
          addRoomRackDays(property.operationalDate, CENTRAL_RESERVATION_WINDOW_DAYS)
      );
    })
    .map((booking) => ({
      assignedRoomNumbers: readRoomRackAssignments(booking.assignedRoomNumbersJson),
      checkInDate: booking.checkInDate,
      confirmationCode: booking.confirmationCode,
      guestName: booking.guestName,
      propertyName: propertyBySlug.get(booking.hotelSlug)?.name ?? 'Managed property',
      rooms: booking.rooms,
      source: booking.source,
    }))
    .sort(
      (left, right) =>
        left.checkInDate.localeCompare(right.checkInDate) ||
        left.propertyName.localeCompare(right.propertyName, 'en-IN') ||
        left.confirmationCode.localeCompare(right.confirmationCode),
    );

  return {
    arrivals,
    summaries,
    totals: {
      activeReservations: summaries.reduce((total, row) => total + row.activeReservations, 0),
      arrivalsToday: summaries.reduce((total, row) => total + row.arrivalsToday, 0),
      inHouse: summaries.reduce((total, row) => total + row.inHouse, 0),
      unassignedArrivals: summaries.reduce((total, row) => total + row.unassignedArrivals, 0),
    },
  } as const;
}
