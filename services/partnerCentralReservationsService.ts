import 'server-only';

import { prisma } from '@/lib/prisma';
import { buildCentralReservationProjection } from '@/lib/pms/centralReservations';
import { resolveOperationalDate } from '@/lib/pms/operationalDate';

const MAX_PROPERTIES = 100;
const MAX_ACTIVE_BOOKINGS = 5_000;

function guestName(guest: { firstName: string; lastName: string } | null): string {
  if (!guest) return 'Guest details unavailable';
  return `${guest.firstName} ${guest.lastName}`.trim().slice(0, 100) || 'Guest details unavailable';
}

export async function getPartnerCentralReservations(partnerId: string) {
  const storedProperties = await prisma.partnerProperty.findMany({
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
  const boundedProperties = storedProperties.slice(0, MAX_PROPERTIES);
  const properties = boundedProperties.map((property) => ({
    id: property.id,
    name: property.displayName,
    operationalDate: resolveOperationalDate(property.operationalDate, property.timezone),
    slug: property.hotelSlug,
  }));
  const hotelSlugs = properties.map((property) => property.slug);
  const earliestOperationalDate = properties.map((property) => property.operationalDate).sort()[0];
  const storedBookings = hotelSlugs.length
    ? await prisma.booking.findMany({
        orderBy: [{ quote: { checkInDate: 'asc' } }, { createdAt: 'asc' }],
        select: {
          assignedRoomNumbersJson: true,
          confirmationCode: true,
          guest: { select: { firstName: true, lastName: true } },
          hotelSlug: true,
          operationalStatus: true,
          quote: { select: { checkInDate: true, checkOutDate: true, rooms: true } },
          source: true,
          status: true,
        },
        take: MAX_ACTIVE_BOOKINGS + 1,
        where: {
          hotelSlug: { in: hotelSlugs },
          operationalStatus: { in: ['RESERVED', 'CHECKED_IN'] },
          quote: { checkOutDate: { gte: earliestOperationalDate } },
          status: 'confirmed',
        },
      })
    : [];
  const projection = buildCentralReservationProjection(
    properties,
    storedBookings.slice(0, MAX_ACTIVE_BOOKINGS).map((booking) => ({
      assignedRoomNumbersJson: booking.assignedRoomNumbersJson,
      checkInDate: booking.quote.checkInDate,
      checkOutDate: booking.quote.checkOutDate,
      confirmationCode: booking.confirmationCode,
      guestName: guestName(booking.guest),
      hotelSlug: booking.hotelSlug,
      operationalStatus: booking.operationalStatus,
      rooms: booking.quote.rooms,
      source: booking.source,
      status: booking.status,
    })),
  );

  return {
    ...projection,
    safetyLimitReached:
      storedProperties.length > MAX_PROPERTIES || storedBookings.length > MAX_ACTIVE_BOOKINGS,
  } as const;
}
