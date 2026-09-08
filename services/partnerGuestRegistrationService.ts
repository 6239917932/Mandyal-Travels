import 'server-only';

import { prisma } from '@/lib/prisma';
import { normalizeHotelBookingReference } from '@/services/customerHotelBookingDetailRules';
import {
  hotelGuestRegistrationFingerprint,
  maskHotelGuestIdentity,
  normalizeHotelGuestRegistration,
  type HotelGuestRegistrationInput,
} from '@/lib/pms/guestRegistration';

const MAX_ACTIVE_STAYS = 200;
const MAX_GUEST_REGISTRATIONS = 20;

export class PartnerGuestRegistrationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type PartnerGuestRegistrationRecord = Readonly<{
  createdAt: string;
  guestName: string;
  identityReference: string;
  identityType: string;
  nationalityCountryCode: string;
  residenceCity: string;
  verificationStatus: string;
}>;

export type PartnerGuestRegistrationStay = Readonly<{
  checkInDate: string;
  checkOutDate: string;
  confirmationCode: string;
  guestName: string;
  hotelName: string;
  operationalStatus: string;
  registrations: readonly PartnerGuestRegistrationRecord[];
  rooms: number;
}>;

function presentRegistration(registration: {
  createdAt: Date;
  guestName: string;
  identityLast4: string;
  identityType: string;
  nationalityCountryCode: string;
  residenceCity: string;
  verificationStatus: string;
}): PartnerGuestRegistrationRecord {
  return {
    createdAt: registration.createdAt.toISOString(),
    guestName: registration.guestName,
    identityReference: maskHotelGuestIdentity(registration.identityLast4),
    identityType: registration.identityType,
    nationalityCountryCode: registration.nationalityCountryCode,
    residenceCity: registration.residenceCity,
    verificationStatus: registration.verificationStatus,
  };
}

export async function getPartnerGuestRegistrationWorkspace(
  partnerId: string,
  requestedConfirmationCode?: string,
): Promise<{
  safetyLimitReached: boolean;
  selectedStay?: PartnerGuestRegistrationStay;
  stays: readonly Omit<PartnerGuestRegistrationStay, 'registrations'>[];
}> {
  const properties = await prisma.partnerProperty.findMany({
    orderBy: { displayName: 'asc' },
    select: { displayName: true, hotelSlug: true },
    take: 101,
    where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
  const propertyBySlug = new Map(
    properties.slice(0, 100).map((property) => [property.hotelSlug, property.displayName]),
  );
  const bookings = await prisma.booking.findMany({
    include: {
      guest: { select: { firstName: true, lastName: true } },
      guestRegistrations: {
        orderBy: { createdAt: 'asc' },
        take: MAX_GUEST_REGISTRATIONS + 1,
      },
      quote: { select: { checkInDate: true, checkOutDate: true, rooms: true } },
    },
    orderBy: [{ quote: { checkInDate: 'asc' } }, { createdAt: 'asc' }],
    take: MAX_ACTIVE_STAYS + 1,
    where: {
      hotelSlug: { in: [...propertyBySlug.keys()] },
      operationalStatus: { in: ['RESERVED', 'CHECKED_IN'] },
      status: 'confirmed',
    },
  });
  const boundedBookings = bookings.slice(0, MAX_ACTIVE_STAYS);
  const stays = boundedBookings.map((booking) => ({
    checkInDate: booking.quote.checkInDate,
    checkOutDate: booking.quote.checkOutDate,
    confirmationCode: booking.confirmationCode,
    guestName: booking.guest
      ? `${booking.guest.firstName} ${booking.guest.lastName}`.trim().slice(0, 100)
      : 'Primary guest unavailable',
    hotelName: propertyBySlug.get(booking.hotelSlug) ?? 'Managed property',
    operationalStatus: booking.operationalStatus,
    rooms: booking.quote.rooms,
  }));
  const requestedReference = normalizeHotelBookingReference(requestedConfirmationCode ?? '');
  const selectedBooking =
    boundedBookings.find((booking) => booking.confirmationCode === requestedReference) ??
    boundedBookings[0];
  const selectedBase = selectedBooking
    ? stays.find((stay) => stay.confirmationCode === selectedBooking.confirmationCode)
    : undefined;

  return {
    safetyLimitReached:
      properties.length > 100 ||
      bookings.length > MAX_ACTIVE_STAYS ||
      Boolean(selectedBooking?.guestRegistrations.length > MAX_GUEST_REGISTRATIONS),
    selectedStay:
      selectedBooking && selectedBase
        ? {
            ...selectedBase,
            registrations: selectedBooking.guestRegistrations
              .slice(0, MAX_GUEST_REGISTRATIONS)
              .map(presentRegistration),
          }
        : undefined,
    stays,
  };
}

export async function registerHotelGuest(input: {
  actorUserId: string;
  confirmationCode: string;
  partnerId: string;
  registration: HotelGuestRegistrationInput;
}): Promise<PartnerGuestRegistrationRecord> {
  const normalized = normalizeHotelGuestRegistration(input.registration);
  const confirmationCode = normalizeHotelBookingReference(input.confirmationCode);
  if (!confirmationCode) {
    throw new PartnerGuestRegistrationError(
      'INVALID_BOOKING_REFERENCE',
      'Choose a valid active hotel stay.',
    );
  }
  return prisma.$transaction(async (transaction) => {
    const properties = await transaction.partnerProperty.findMany({
      select: { hotelSlug: true },
      take: 101,
      where: {
        listingSource: 'MANAGED',
        partnerId: input.partnerId,
        status: 'ACTIVE',
      },
    });
    const booking = await transaction.booking.findFirst({
      select: { id: true },
      where: {
        confirmationCode,
        operationalStatus: { in: ['RESERVED', 'CHECKED_IN'] },
        status: 'confirmed',
        hotelSlug: { in: properties.slice(0, 100).map((property) => property.hotelSlug) },
      },
    });
    if (!booking) {
      throw new PartnerGuestRegistrationError(
        'BOOKING_NOT_FOUND',
        'The active hotel stay was not found for this partner.',
      );
    }
    const referenceFingerprint = hotelGuestRegistrationFingerprint(booking.id, normalized);
    const existing = await transaction.hotelGuestRegistration.findUnique({
      where: { referenceFingerprint },
    });
    if (existing) return presentRegistration(existing);

    const registration = await transaction.hotelGuestRegistration.create({
      data: {
        ...normalized,
        bookingId: booking.id,
        referenceFingerprint,
        verifiedByUserId: input.actorUserId,
      },
    });
    await transaction.partnerAuditLog.create({
      data: {
        action: 'HOTEL_GUEST_REGISTERED',
        actorUserId: input.actorUserId,
        entityId: registration.id,
        entityType: 'HOTEL_GUEST_REGISTRATION',
        metadataJson: JSON.stringify({
          confirmationCode,
          identityType: normalized.identityType,
          verificationStatus: registration.verificationStatus,
        }),
        partnerId: input.partnerId,
        summary: `A guest identity reference was recorded for ${confirmationCode}.`,
      },
    });
    return presentRegistration(registration);
  });
}
