import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  GUEST_CRM_MAX_BOOKINGS,
  GUEST_CRM_MAX_PROFILES,
  GUEST_CRM_MAX_PROPERTIES,
  GUEST_CRM_MAX_STAYS_PER_PROFILE,
  guestCrmDate,
  guestCrmText,
  guestRecognition,
  maskGuestCrmEmail,
  maskGuestCrmPhone,
  normalizeGuestCrmEmail,
} from '@/lib/pms/guestCrm';
import { normalizeHotelBookingReference } from '@/services/customerHotelBookingDetailRules';

type GuestCrmStay = Readonly<{
  checkInDate: string;
  checkOutDate: string;
  confirmationCode: string;
  consentReferences: number;
  hotelName: string;
  operationalStatus: string;
  specialRequest: string;
}>;

export type PartnerGuestCrmProfile = Readonly<{
  guestName: string;
  maskedEmail: string;
  maskedPhone: string;
  recognition: ReturnType<typeof guestRecognition>;
  selectionReference: string;
  stayCount: number;
  stays: readonly GuestCrmStay[];
  staysTruncated: boolean;
}>;

export async function getPartnerGuestCrmWorkspace(input: {
  partnerId: string;
  requestedProfile?: string;
}): Promise<{
  profiles: readonly PartnerGuestCrmProfile[];
  safetyLimitReached: boolean;
  selectedProfile?: PartnerGuestCrmProfile;
}> {
  const storedProperties = await prisma.partnerProperty.findMany({
    orderBy: { displayName: 'asc' },
    select: { displayName: true, hotelSlug: true },
    take: GUEST_CRM_MAX_PROPERTIES + 1,
    where: {
      listingSource: 'MANAGED',
      partnerId: input.partnerId,
      status: 'ACTIVE',
    },
  });
  const properties = storedProperties.slice(0, GUEST_CRM_MAX_PROPERTIES);
  const propertyBySlug = new Map(
    properties.map((property) => [property.hotelSlug, property.displayName]),
  );
  const storedBookings = await prisma.booking.findMany({
    include: {
      _count: { select: { guestRegistrations: { where: { consentRecorded: true } } } },
      guest: true,
      quote: { select: { checkInDate: true, checkOutDate: true } },
    },
    orderBy: [{ quote: { checkInDate: 'desc' } }, { createdAt: 'desc' }],
    take: GUEST_CRM_MAX_BOOKINGS + 1,
    where: {
      hotelSlug: { in: [...propertyBySlug.keys()] },
      status: 'confirmed',
    },
  });

  const grouped = new Map<
    string,
    {
      guestName: string;
      maskedEmail: string;
      maskedPhone: string;
      selectionReference: string;
      stays: GuestCrmStay[];
    }
  >();
  for (const booking of storedBookings.slice(0, GUEST_CRM_MAX_BOOKINGS)) {
    if (!booking.guest) continue;
    const email = normalizeGuestCrmEmail(booking.guest.email);
    const hotelName = propertyBySlug.get(booking.hotelSlug);
    const confirmationCode = normalizeHotelBookingReference(booking.confirmationCode);
    if (!email || !hotelName || !confirmationCode) continue;
    const guestName = guestCrmText(
      `${booking.guest.firstName} ${booking.guest.lastName}`,
      'Hotel guest',
      120,
    );
    const stay: GuestCrmStay = {
      checkInDate: guestCrmDate(booking.quote.checkInDate),
      checkOutDate: guestCrmDate(booking.quote.checkOutDate),
      confirmationCode,
      consentReferences: booking._count.guestRegistrations,
      hotelName: guestCrmText(hotelName, 'Managed property', 160),
      operationalStatus: guestCrmText(booking.operationalStatus, 'UNKNOWN', 40),
      specialRequest: guestCrmText(booking.guest.specialRequests, '', 500),
    };
    const existing = grouped.get(email);
    if (existing) {
      existing.stays.push(stay);
      continue;
    }
    grouped.set(email, {
      guestName,
      maskedEmail: maskGuestCrmEmail(email),
      maskedPhone: maskGuestCrmPhone(booking.guest.phone),
      selectionReference: confirmationCode,
      stays: [stay],
    });
  }

  const profiles = [...grouped.values()]
    .slice(0, GUEST_CRM_MAX_PROFILES)
    .map((profile): PartnerGuestCrmProfile => ({
      guestName: profile.guestName,
      maskedEmail: profile.maskedEmail,
      maskedPhone: profile.maskedPhone,
      recognition: guestRecognition(profile.stays.length),
      selectionReference: profile.selectionReference,
      stayCount: profile.stays.length,
      stays: profile.stays.slice(0, GUEST_CRM_MAX_STAYS_PER_PROFILE),
      staysTruncated: profile.stays.length > GUEST_CRM_MAX_STAYS_PER_PROFILE,
    }));
  const requestedProfile = normalizeHotelBookingReference(input.requestedProfile ?? '');
  const selectedProfile =
    profiles.find((profile) =>
      profile.stays.some((stay) => stay.confirmationCode === requestedProfile),
    ) ?? profiles[0];

  return {
    profiles,
    safetyLimitReached:
      storedProperties.length > GUEST_CRM_MAX_PROPERTIES ||
      storedBookings.length > GUEST_CRM_MAX_BOOKINGS ||
      grouped.size > GUEST_CRM_MAX_PROFILES,
    selectedProfile,
  };
}
