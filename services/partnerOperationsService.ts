import { prisma } from '@/lib/prisma';
import { normalizeHotelAmenityList } from '@/lib/hotel/amenities';
import type { Prisma } from '@/generated/prisma/client';
import {
  availablePhysicalRooms,
  evaluateStayTiming,
  evaluateStayTransition,
  normalizeRoomAssignments,
} from '@/lib/hotel/stayOperations';
import type { CarOffer, CarSearchCriteria } from '@/types/car';
import { busSeatSetsMatch, seatsFitBusCapacity } from '@/lib/bus/bookingRules';
import {
  normalizeVehicleComplianceDates,
  vehicleComplianceState,
  type VehicleComplianceDates,
} from '@/lib/car/complianceRules';
import { summarizePersistedPartnerKyc } from '@/lib/partner/kycPersistenceRules';
import {
  evaluatePropertyListingRisk,
  evaluateVehicleListingRisk,
  vehicleMayBePublished,
} from '@/lib/partner/listingRiskRules';

const DAY_MS = 86_400_000;
const MAX_CALENDAR_DAYS = 93;
const OCCUPYING_VEHICLE_RESERVATION_STATUSES = ['CONFIRMED', 'PICKED_UP'];
const VALUE_VEHICLE_RESERVATION_STATUSES = ['COMPLETED', 'CONFIRMED', 'PICKED_UP'];

export class PartnerOperationsError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function normalizeText(value: string, maximum: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, maximum);
}

function enumerateDates(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const count = Math.ceil((end.getTime() - start.getTime()) / DAY_MS);
  if (!Number.isFinite(count) || count < 1 || count > MAX_CALENDAR_DAYS) {
    throw new PartnerOperationsError(
      'INVALID_DATE_RANGE',
      `Choose a date range between 1 and ${MAX_CALENDAR_DAYS} days.`,
    );
  }
  const dates: string[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    dates.push(new Date(start.getTime() + offset * DAY_MS).toISOString().slice(0, 10));
  }
  return dates;
}

function createVehicleCode(partnerId: string, name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36);
  return `direct-${partnerId.slice(-6)}-${base || 'vehicle'}-${crypto.randomUUID().slice(0, 6)}`;
}

function createPropertySlug(partnerId: string, name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${base || 'property'}-${partnerId.slice(-6)}-${crypto.randomUUID().slice(0, 6)}`;
}

function createRoomTypeCode(propertyId: string, name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36);
  return `direct-${propertyId.slice(-6)}-${base || 'room'}-${crypto.randomUUID().slice(0, 6)}`;
}

function createRatePlanCode(roomTypeId: string, name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return `rate-${roomTypeId.slice(-12)}-${base || 'plan'}-${crypto.randomUUID().slice(0, 6)}`;
}

function validateImageUrl(value: string, fallback: string) {
  const candidate = value.trim();
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || url.hostname !== 'images.unsplash.com') throw new Error();
    return candidate.slice(0, 800);
  } catch {
    throw new PartnerOperationsError(
      'INVALID_IMAGE_URL',
      'Use a secure images.unsplash.com photo URL, or leave the image field blank.',
    );
  }
}

function normalizedList(values: string[], maximumItems = 20) {
  return [...new Set(values.map((value) => normalizeText(value, 120)).filter(Boolean))].slice(
    0,
    maximumItems,
  );
}

function readStoredStringList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function dateInTimezone(timezone: string, instant = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      timeZone: timezone,
      year: 'numeric',
    }).formatToParts(instant);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';
    return `${value('year')}-${value('month')}-${value('day')}`;
  } catch {
    throw new PartnerOperationsError(
      'INVALID_PROPERTY_TIMEZONE',
      'The property timezone must be corrected before recording stay operations.',
    );
  }
}

function reservationUnitsForDate(
  reservations: Array<{ dropoffDate: string; pickupDate: string; units: number }>,
  serviceDate: string,
) {
  return reservations
    .filter(
      (reservation) =>
        reservation.pickupDate <= serviceDate && reservation.dropoffDate > serviceDate,
    )
    .reduce((total, reservation) => total + reservation.units, 0);
}

export const partnerOperationsService = {
  async listAvailablePhysicalRooms(partnerId: string, confirmationCode: string) {
    const properties = await prisma.partnerProperty.findMany({
      select: { hotelSlug: true, id: true },
      where: { partnerId, status: 'ACTIVE' },
    });
    const booking = await prisma.booking.findFirst({
      include: { quote: true },
      where: {
        confirmationCode,
        hotelSlug: { in: properties.map((property) => property.hotelSlug) },
        status: 'confirmed',
      },
    });
    if (!booking) {
      throw new PartnerOperationsError('BOOKING_NOT_FOUND', 'The hotel booking was not found.');
    }
    const property = properties.find((candidate) => candidate.hotelSlug === booking.hotelSlug);
    if (!property) {
      throw new PartnerOperationsError(
        'PROPERTY_NOT_FOUND',
        'The assigned property was not found.',
      );
    }
    const ratePlan = await prisma.partnerRatePlan.findUnique({
      include: {
        room: {
          include: {
            physicalRooms: {
              orderBy: [{ floorLabel: 'asc' }, { roomNumber: 'asc' }],
              where: { housekeepingStatus: 'READY', operationalStatus: 'ACTIVE' },
            },
          },
        },
      },
      where: { ratePlanId: booking.quote.ratePlanId },
    });
    if (!ratePlan || ratePlan.room.propertyId !== property.id) {
      throw new PartnerOperationsError(
        'ROOM_TYPE_NOT_FOUND',
        'The booked room type is not managed by this property.',
      );
    }
    const activeStays = await prisma.booking.findMany({
      select: { assignedRoomNumbersJson: true },
      where: {
        hotelSlug: booking.hotelSlug,
        id: { not: booking.id },
        operationalStatus: 'CHECKED_IN',
        status: 'confirmed',
      },
    });
    const occupiedRooms = new Set(
      activeStays.flatMap((stay) => readStoredStringList(stay.assignedRoomNumbersJson)),
    );
    return availablePhysicalRooms(ratePlan.room.physicalRooms, occupiedRooms).map((room) => ({
      floorLabel: room.floorLabel,
      roomNumber: room.roomNumber,
    }));
  },

  async updateHotelStayStatus(
    partnerId: string,
    confirmationCode: string,
    nextStatus: 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW',
    assignedRoomNumbers: string[] = [],
    actorUserId?: string,
  ) {
    const properties = await prisma.partnerProperty.findMany({
      select: { hotelSlug: true, id: true, timezone: true },
      where: { partnerId, status: 'ACTIVE' },
    });
    const booking = await prisma.booking.findFirst({
      include: { quote: true },
      where: {
        confirmationCode,
        hotelSlug: { in: properties.map((property) => property.hotelSlug) },
      },
    });
    if (!booking) {
      throw new PartnerOperationsError('BOOKING_NOT_FOUND', 'The hotel booking was not found.');
    }
    if (booking.status !== 'confirmed') {
      throw new PartnerOperationsError(
        'BOOKING_CANCELLED',
        'A cancelled booking cannot be updated.',
      );
    }
    const property = properties.find((candidate) => candidate.hotelSlug === booking.hotelSlug);
    if (!property) {
      throw new PartnerOperationsError(
        'PROPERTY_NOT_FOUND',
        'The assigned property was not found.',
      );
    }
    const localDate = dateInTimezone(property.timezone);
    const timingViolation = evaluateStayTiming({
      checkInDate: booking.quote.checkInDate,
      checkOutDate: booking.quote.checkOutDate,
      localDate,
      nextStatus,
    });
    if (timingViolation)
      throw new PartnerOperationsError(timingViolation.code, timingViolation.message);
    const transitionViolation = evaluateStayTransition(booking.operationalStatus, nextStatus);
    if (transitionViolation) {
      throw new PartnerOperationsError(transitionViolation.code, transitionViolation.message);
    }
    const assignmentResult =
      nextStatus === 'CHECKED_IN'
        ? normalizeRoomAssignments(assignedRoomNumbers, booking.quote.rooms)
        : { roomNumbers: [] as string[] };
    if (assignmentResult.violation) {
      throw new PartnerOperationsError(
        assignmentResult.violation.code,
        assignmentResult.violation.message,
      );
    }
    const normalizedRoomNumbers = assignmentResult.roomNumbers;
    const bookedRatePlan = await prisma.partnerRatePlan.findUnique({
      include: { room: { include: { physicalRooms: true } } },
      where: { ratePlanId: booking.quote.ratePlanId },
    });
    const registeredRooms = bookedRatePlan?.room.physicalRooms ?? [];
    if (nextStatus === 'CHECKED_IN' && registeredRooms.length) {
      const registeredByNumber = new Map(
        registeredRooms.map((physicalRoom) => [physicalRoom.roomNumber, physicalRoom]),
      );
      const unavailableRooms = normalizedRoomNumbers.filter((roomNumber) => {
        const registeredRoom = registeredByNumber.get(roomNumber);
        return (
          !registeredRoom ||
          registeredRoom.operationalStatus !== 'ACTIVE' ||
          registeredRoom.housekeepingStatus !== 'READY'
        );
      });
      if (unavailableRooms.length) {
        throw new PartnerOperationsError(
          'PHYSICAL_ROOM_UNAVAILABLE',
          `Use registered, ready rooms for this room type. Unavailable: ${unavailableRooms.join(', ')}.`,
        );
      }
    }
    return prisma.$transaction(async (transaction) => {
      if (nextStatus === 'CHECKED_IN') {
        const activeStays = await transaction.booking.findMany({
          include: { quote: true },
          where: {
            hotelSlug: booking.hotelSlug,
            id: { not: booking.id },
            operationalStatus: 'CHECKED_IN',
            quote: {
              checkInDate: { lt: booking.quote.checkOutDate },
              checkOutDate: { gt: booking.quote.checkInDate },
            },
            status: 'confirmed',
          },
        });
        const occupiedRooms = new Set(
          activeStays.flatMap((stay) => readStoredStringList(stay.assignedRoomNumbersJson)),
        );
        const conflicts = normalizedRoomNumbers.filter((roomNumber) =>
          occupiedRooms.has(roomNumber),
        );
        if (conflicts.length) {
          throw new PartnerOperationsError(
            'ROOM_ALREADY_ASSIGNED',
            `Physical room ${conflicts.join(', ')} is already assigned to an overlapping checked-in stay.`,
          );
        }
      }
      const updated = await transaction.booking.update({
        data: {
          assignedRoomNumbersJson:
            nextStatus === 'CHECKED_IN'
              ? JSON.stringify(normalizedRoomNumbers)
              : booking.assignedRoomNumbersJson,
          operationalStatus: nextStatus,
        },
        where: { id: booking.id },
      });
      if (nextStatus === 'CHECKED_OUT' && booking.assignedRoomNumbersJson !== '[]') {
        await transaction.partnerPhysicalRoom.updateMany({
          data: { housekeepingStatus: 'DIRTY' },
          where: {
            propertyId: property.id,
            roomNumber: { in: readStoredStringList(booking.assignedRoomNumbersJson) },
          },
        });
      }
      await transaction.partnerAuditLog.create({
        data: {
          action: `HOTEL_STAY_${nextStatus}`,
          actorUserId,
          entityId: booking.id,
          entityType: 'HOTEL_BOOKING',
          metadataJson: JSON.stringify({
            confirmationCode,
            previousStatus: booking.operationalStatus,
            assignedRoomNumbers: nextStatus === 'CHECKED_IN' ? normalizedRoomNumbers : undefined,
          }),
          partnerId,
          summary: `${confirmationCode} was marked ${nextStatus.toLowerCase().replaceAll('_', ' ')}.`,
        },
      });
      return updated;
    });
  },
  async updateHotelPartnerNote(
    partnerId: string,
    confirmationCode: string,
    partnerNote: string,
    actorUserId?: string,
  ) {
    const propertySlugs = await prisma.partnerProperty.findMany({
      select: { hotelSlug: true },
      where: { partnerId, status: 'ACTIVE' },
    });
    const booking = await prisma.booking.findFirst({
      where: {
        confirmationCode,
        hotelSlug: { in: propertySlugs.map((property) => property.hotelSlug) },
      },
    });
    if (!booking)
      throw new PartnerOperationsError('BOOKING_NOT_FOUND', 'The assigned booking was not found.');
    const normalizedNote = partnerNote.trim().replace(/\r\n/g, '\n').slice(0, 1_000);
    return prisma.$transaction(async (transaction) => {
      const updated = await transaction.booking.update({
        data: { partnerNote: normalizedNote },
        where: { id: booking.id },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'HOTEL_BOOKING_NOTE_UPDATED',
          actorUserId,
          entityId: booking.id,
          entityType: 'HOTEL_BOOKING',
          metadataJson: JSON.stringify({ confirmationCode, noteLength: normalizedNote.length }),
          partnerId,
          summary: `${confirmationCode} front-desk note was updated.`,
        },
      });
      return updated;
    });
  },
  async createApplication(input: {
    applicantUserId: string;
    businessName: string;
    city: string;
    contactEmail: string;
    contactName: string;
    contactPhone: string;
    inventorySummary: string;
    partnerType: string;
    legalBusinessName: string;
    registeredAddress: string;
    taxIdentifier: string;
    registrationId: string;
    identityType: string;
    identityReference: string;
  }) {
    if (!['HOTEL', 'CAR', 'BUS'].includes(input.partnerType)) {
      throw new PartnerOperationsError(
        'INVALID_PARTNER_TYPE',
        'Choose hotel, car, or bus supplier onboarding.',
      );
    }
    if (
      input.businessName.trim().length < 2 ||
      input.contactName.trim().length < 2 ||
      !input.contactEmail.includes('@') ||
      input.contactPhone.trim().length < 6 ||
      input.city.trim().length < 2 ||
      input.inventorySummary.trim().length < 20 ||
      input.legalBusinessName.trim().length < 2 ||
      input.registeredAddress.trim().length < 10 ||
      !/^(?:[A-Z]{5}[0-9]{4}[A-Z]|[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z])$/.test(
        input.taxIdentifier.trim().toUpperCase(),
      ) ||
      input.registrationId.trim().length < 3 ||
      !['AADHAAR_LAST4', 'PASSPORT', 'DRIVING_LICENCE'].includes(input.identityType) ||
      (input.identityType === 'AADHAAR_LAST4'
        ? !/^\d{4}$/.test(input.identityReference.trim())
        : input.identityReference.trim().length < 5)
    ) {
      throw new PartnerOperationsError(
        'INVALID_APPLICATION',
        'Complete all supplier details with valid business contact information.',
      );
    }
    const existingMembership = await prisma.supplyPartnerMember.findUnique({
      where: { userId: input.applicantUserId },
    });
    if (existingMembership) {
      throw new PartnerOperationsError(
        'PARTNER_ALREADY_ASSIGNED',
        'This account already has supplier workspace access.',
      );
    }
    const pending = await prisma.partnerApplication.findFirst({
      where: { applicantUserId: input.applicantUserId, status: 'PENDING' },
    });
    if (pending) return pending;
    return prisma.partnerApplication.create({
      data: {
        applicantUserId: input.applicantUserId,
        businessName: normalizeText(input.businessName, 120),
        city: normalizeText(input.city, 80),
        contactEmail: input.contactEmail.trim().toLowerCase().slice(0, 254),
        contactName: normalizeText(input.contactName, 100),
        contactPhone: normalizeText(input.contactPhone, 30),
        inventorySummary: normalizeText(input.inventorySummary, 800),
        partnerType: input.partnerType,
        identityReference: normalizeText(input.identityReference, 40),
        identityType: input.identityType,
        kycConsentAt: new Date(),
        legalBusinessName: normalizeText(input.legalBusinessName, 160),
        registeredAddress: normalizeText(input.registeredAddress, 300),
        registrationId: normalizeText(input.registrationId, 60),
        taxIdentifier: input.taxIdentifier.trim().toUpperCase(),
      },
    });
  },

  async reviewApplication(input: {
    applicationId: string;
    decision: 'APPROVE' | 'REJECT';
    reviewNote: string;
    reviewerUserId: string;
  }) {
    return prisma.$transaction(async (transaction) => {
      const application = await transaction.partnerApplication.findUnique({
        include: { applicant: true, kycDocuments: true },
        where: { id: input.applicationId },
      });
      if (!application || application.status !== 'PENDING') {
        throw new PartnerOperationsError(
          'APPLICATION_UNAVAILABLE',
          'This supplier application is no longer awaiting review.',
        );
      }
      if (input.decision === 'REJECT') {
        return transaction.partnerApplication.update({
          data: {
            reviewedAt: new Date(),
            reviewedByUserId: input.reviewerUserId,
            reviewNote: normalizeText(input.reviewNote, 500),
            kycStatus: 'REJECTED',
            status: 'REJECTED',
          },
          where: { id: application.id },
        });
      }
      if (
        application.partnerType !== 'BUS' &&
        application.partnerType !== 'CAR' &&
        application.partnerType !== 'HOTEL'
      ) {
        throw new PartnerOperationsError(
          'PARTNER_TYPE_UNSUPPORTED',
          'This supplier type cannot complete governed verification.',
        );
      }
      const kycSummary = summarizePersistedPartnerKyc({
        documents: application.kycDocuments,
        partnerType: application.partnerType,
        today: new Date().toISOString().slice(0, 10),
      });
      if (!kycSummary.complete) {
        const blocked = [...kycSummary.missing, ...kycSummary.expired];
        throw new PartnerOperationsError(
          'KYC_EVIDENCE_INCOMPLETE',
          `Verify all required supplier evidence before approval: ${blocked.join(', ')}.`,
        );
      }
      if (!['CUSTOMER', 'PARTNER_ADMIN', 'PARTNER_OPERATOR'].includes(application.applicant.role)) {
        throw new PartnerOperationsError(
          'ROLE_CONFLICT',
          'Use a separate customer account for supplier operations.',
        );
      }
      const member = await transaction.supplyPartnerMember.findUnique({
        where: { userId: application.applicantUserId },
      });
      if (member) {
        throw new PartnerOperationsError(
          'PARTNER_ALREADY_ASSIGNED',
          'This account is already assigned to a supplier workspace.',
        );
      }
      const partner = await transaction.supplyPartner.create({
        data: {
          contactEmail: application.contactEmail,
          contactPhone: application.contactPhone,
          name: application.businessName,
          status: 'ACTIVE',
          type: application.partnerType,
        },
      });
      await transaction.supplyPartnerMember.create({
        data: {
          partnerId: partner.id,
          role: 'ADMIN',
          userId: application.applicantUserId,
        },
      });
      await transaction.user.update({
        data: { role: 'PARTNER_ADMIN' },
        where: { id: application.applicantUserId },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'PARTNER_APPLICATION_APPROVED',
          actorUserId: input.reviewerUserId,
          entityId: application.id,
          entityType: 'PARTNER_APPLICATION',
          metadataJson: JSON.stringify({ partnerType: application.partnerType }),
          partnerId: partner.id,
          summary: 'Supplier application approved and secure workspace provisioned.',
        },
      });
      await transaction.partnerKycDocument.updateMany({
        data: { partnerId: partner.id },
        where: { applicationId: application.id },
      });
      return transaction.partnerApplication.update({
        data: {
          partnerId: partner.id,
          reviewedAt: new Date(),
          reviewedByUserId: input.reviewerUserId,
          reviewNote: normalizeText(input.reviewNote, 500),
          kycStatus: 'VERIFIED',
          status: 'APPROVED',
        },
        where: { id: application.id },
      });
    });
  },

  async createProperty(
    partnerId: string,
    input: {
      amenities: string[];
      checkInTime: string;
      checkOutTime: string;
      city: string;
      district: string;
      childrenAllowed: boolean;
      contactEmail: string;
      contactPhone: string;
      country: string;
      description: string;
      displayName: string;
      imageUrl: string;
      imageUrls: string[];
      languages: string[];
      landmarks: string[];
      locality: string;
      locationAliases: string[];
      latitude: number;
      longitude: number;
      minimumCheckInAge: number;
      petsAllowed: boolean;
      policies: string[];
      postalCode: string;
      propertyType: string;
      smokingAllowed: boolean;
      starRating: number;
      state: string;
      streetAddress: string;
      tehsil: string;
      timezone: string;
    },
  ) {
    if (
      input.displayName.trim().length < 2 ||
      input.description.trim().length < 30 ||
      input.locality.trim().length < 2 ||
      input.city.trim().length < 2 ||
      input.district.trim().length < 2 ||
      input.state.trim().length < 2 ||
      input.country.trim().length < 2 ||
      input.streetAddress.trim().length < 5
    ) {
      throw new PartnerOperationsError(
        'INVALID_PROPERTY',
        'Complete the property name, description, locality, district, city or town, and street address.',
      );
    }
    if (!Number.isInteger(input.starRating) || input.starRating < 1 || input.starRating > 5) {
      throw new PartnerOperationsError('INVALID_STAR_RATING', 'Star rating must be from 1 to 5.');
    }
    if (
      !Number.isInteger(input.minimumCheckInAge) ||
      input.minimumCheckInAge < 16 ||
      input.minimumCheckInAge > 30
    ) {
      throw new PartnerOperationsError(
        'INVALID_CHECK_IN_AGE',
        'Minimum check-in age must be from 16 to 30.',
      );
    }
    if (
      !Number.isFinite(input.latitude) ||
      input.latitude < -90 ||
      input.latitude > 90 ||
      !Number.isFinite(input.longitude) ||
      input.longitude < -180 ||
      input.longitude > 180
    ) {
      throw new PartnerOperationsError(
        'INVALID_COORDINATES',
        'Enter valid latitude and longitude coordinates.',
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail.trim())) {
      throw new PartnerOperationsError(
        'INVALID_PROPERTY_CONTACT',
        'Enter a valid property contact email.',
      );
    }
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.checkInTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.checkOutTime)
    ) {
      throw new PartnerOperationsError(
        'INVALID_STAY_TIME',
        'Enter valid check-in and check-out times.',
      );
    }
    return prisma.partnerProperty.create({
      data: {
        amenitiesJson: JSON.stringify(normalizeHotelAmenityList(input.amenities).slice(0, 100)),
        checkInTime: input.checkInTime,
        checkOutTime: input.checkOutTime,
        city: normalizeText(input.city, 80),
        district: normalizeText(input.district, 80),
        childrenAllowed: input.childrenAllowed,
        contactEmail: normalizeText(input.contactEmail.toLowerCase(), 254),
        contactPhone: normalizeText(input.contactPhone, 30),
        country: normalizeText(input.country, 80),
        description: normalizeText(input.description, 1_500),
        displayName: normalizeText(input.displayName, 140),
        hotelSlug: createPropertySlug(partnerId, input.displayName),
        imageUrl: validateImageUrl(
          input.imageUrl,
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
        ),
        imageUrlsJson: JSON.stringify(
          input.imageUrls
            .slice(0, 12)
            .map((url) => validateImageUrl(url, ''))
            .filter(Boolean),
        ),
        languagesJson: JSON.stringify(normalizedList(input.languages, 12)),
        landmarksJson: JSON.stringify(normalizedList(input.landmarks, 12)),
        locality: normalizeText(input.locality, 100),
        locationAliasesJson: JSON.stringify(normalizedList(input.locationAliases, 20)),
        latitude: input.latitude,
        longitude: input.longitude,
        listingSource: 'MANAGED',
        minimumCheckInAge: input.minimumCheckInAge,
        partnerId,
        petsAllowed: input.petsAllowed,
        policiesJson: JSON.stringify(normalizedList(input.policies, 12)),
        postalCode: normalizeText(input.postalCode, 20),
        publicationStatus: 'DRAFT',
        propertyType: normalizeText(input.propertyType, 40).toUpperCase(),
        smokingAllowed: input.smokingAllowed,
        starRating: input.starRating,
        state: normalizeText(input.state, 80),
        streetAddress: normalizeText(input.streetAddress, 240),
        tehsil: normalizeText(input.tehsil, 80),
        timezone: normalizeText(input.timezone, 80),
      },
    });
  },

  async createRoomType(
    partnerId: string,
    propertyId: string,
    input: {
      amenities: string[];
      bedDescription: string;
      cancellationDescription: string;
      description: string;
      freeCancellationHours: number;
      imageUrl: string;
      inventoryCount: number;
      maximumAdults: number;
      maximumChildren: number;
      maximumGuests: number;
      mealPlan: string;
      name: string;
      nightlyRate: number;
      ratePlanName: string;
      refundable: boolean;
      taxesAndFees: number;
    },
  ) {
    const property = await prisma.partnerProperty.findFirst({
      where: { id: propertyId, listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    });
    if (!property)
      throw new PartnerOperationsError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
    if (
      input.name.trim().length < 2 ||
      input.description.trim().length < 20 ||
      input.bedDescription.trim().length < 2 ||
      input.ratePlanName.trim().length < 2 ||
      input.cancellationDescription.trim().length < 10
    ) {
      throw new PartnerOperationsError(
        'INVALID_ROOM',
        'Complete the room, bed, rate, and cancellation details.',
      );
    }
    if (
      !Number.isInteger(input.inventoryCount) ||
      input.inventoryCount < 1 ||
      input.inventoryCount > 500
    ) {
      throw new PartnerOperationsError(
        'INVALID_ROOM_COUNT',
        'Room inventory must be between 1 and 500.',
      );
    }
    if (
      !Number.isInteger(input.maximumAdults) ||
      input.maximumAdults < 1 ||
      input.maximumAdults > 20 ||
      !Number.isInteger(input.maximumChildren) ||
      input.maximumChildren < 0 ||
      input.maximumChildren > 20 ||
      !Number.isInteger(input.maximumGuests) ||
      input.maximumGuests < 1 ||
      input.maximumGuests > 30 ||
      input.maximumGuests < input.maximumAdults
    ) {
      throw new PartnerOperationsError(
        'INVALID_OCCUPANCY',
        'Enter a valid adult, child, and maximum guest capacity.',
      );
    }
    if (
      !Number.isInteger(input.nightlyRate) ||
      input.nightlyRate < 100 ||
      input.nightlyRate > 5_000_000 ||
      !Number.isInteger(input.taxesAndFees) ||
      input.taxesAndFees < 0 ||
      input.taxesAndFees > 1_000_000
    ) {
      throw new PartnerOperationsError(
        'INVALID_RATE',
        'Enter a valid nightly rate and taxes in INR.',
      );
    }
    if (!['room-only', 'breakfast-included', 'half-board', 'full-board'].includes(input.mealPlan)) {
      throw new PartnerOperationsError('INVALID_MEAL_PLAN', 'Choose a valid meal plan.');
    }
    if (
      !Number.isInteger(input.freeCancellationHours) ||
      input.freeCancellationHours < 0 ||
      input.freeCancellationHours > 720
    ) {
      throw new PartnerOperationsError(
        'INVALID_CANCELLATION_CUTOFF',
        'Cancellation cutoff must be between 0 and 720 hours.',
      );
    }
    return prisma.$transaction(async (transaction) => {
      const room = await transaction.partnerRoomType.create({
        data: {
          amenitiesJson: JSON.stringify(normalizeHotelAmenityList(input.amenities).slice(0, 50)),
          bedDescription: normalizeText(input.bedDescription, 160),
          cancellationDescription: normalizeText(input.cancellationDescription, 300),
          description: normalizeText(input.description, 800),
          imageUrl: validateImageUrl(
            input.imageUrl,
            'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          ),
          inventoryCount: input.inventoryCount,
          maximumAdults: input.maximumAdults,
          maximumChildren: input.maximumChildren,
          maximumGuests: input.maximumGuests,
          mealPlan: input.mealPlan,
          name: normalizeText(input.name, 120),
          nightlyRate: input.nightlyRate,
          propertyId,
          ratePlanName: normalizeText(input.ratePlanName, 100),
          refundable: input.refundable,
          roomTypeId: createRoomTypeCode(propertyId, input.name),
          taxesAndFees: input.taxesAndFees,
        },
      });
      await transaction.partnerRatePlan.create({
        data: {
          cancellationDescription: normalizeText(input.cancellationDescription, 300),
          freeCancellationHours: input.freeCancellationHours,
          maximumStayNights: 30,
          mealPlan: input.mealPlan,
          minimumStayNights: 1,
          name: normalizeText(input.ratePlanName, 100),
          nightlyRate: input.nightlyRate,
          ratePlanId: `rate-${room.roomTypeId}`,
          refundable: input.refundable,
          roomId: room.id,
          taxesAndFees: input.taxesAndFees,
        },
      });
      await transaction.partnerProperty.update({
        data:
          property.approvalStatus === 'APPROVED'
            ? { publicationStatus: 'PUBLISHED' }
            : {
                approvalNote: '',
                approvalStatus: 'PENDING_REVIEW',
                publicationStatus: 'DRAFT',
                submittedAt: new Date(),
              },
        where: { id: propertyId },
      });
      return transaction.partnerRoomType.findUniqueOrThrow({
        include: { ratePlans: { where: { status: 'ACTIVE' } } },
        where: { id: room.id },
      });
    });
  },

  async createRatePlan(
    partnerId: string,
    propertyId: string,
    roomId: string,
    input: {
      cancellationDescription: string;
      freeCancellationHours: number;
      maximumStayNights: number;
      mealPlan: string;
      minimumStayNights: number;
      name: string;
      nightlyRate: number;
      refundable: boolean;
      taxesAndFees: number;
    },
  ) {
    const room = await prisma.partnerRoomType.findFirst({
      include: { property: true, ratePlans: { where: { status: 'ACTIVE' } } },
      where: {
        id: roomId,
        propertyId,
        property: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
        status: 'ACTIVE',
      },
    });
    if (!room) throw new PartnerOperationsError('ROOM_NOT_FOUND', 'The room type was not found.');
    if (room.ratePlans.length >= 8) {
      throw new PartnerOperationsError(
        'RATE_PLAN_LIMIT',
        'A room can have up to 8 active rate plans.',
      );
    }
    if (input.name.trim().length < 2 || input.cancellationDescription.trim().length < 10) {
      throw new PartnerOperationsError(
        'INVALID_RATE_PLAN',
        'Complete the rate plan and cancellation details.',
      );
    }
    if (
      !Number.isInteger(input.nightlyRate) ||
      input.nightlyRate < 100 ||
      input.nightlyRate > 5_000_000 ||
      !Number.isInteger(input.taxesAndFees) ||
      input.taxesAndFees < 0 ||
      input.taxesAndFees > 1_000_000
    ) {
      throw new PartnerOperationsError(
        'INVALID_RATE',
        'Enter a valid nightly rate and taxes in INR.',
      );
    }
    if (
      !Number.isInteger(input.minimumStayNights) ||
      input.minimumStayNights < 1 ||
      input.minimumStayNights > 30 ||
      !Number.isInteger(input.maximumStayNights) ||
      input.maximumStayNights < input.minimumStayNights ||
      input.maximumStayNights > 90
    ) {
      throw new PartnerOperationsError(
        'INVALID_STAY_RESTRICTION',
        'Stay limits must be between 1 and 90 nights.',
      );
    }
    if (!['room-only', 'breakfast-included', 'half-board', 'full-board'].includes(input.mealPlan)) {
      throw new PartnerOperationsError('INVALID_MEAL_PLAN', 'Choose a valid meal plan.');
    }
    if (
      !Number.isInteger(input.freeCancellationHours) ||
      input.freeCancellationHours < 0 ||
      input.freeCancellationHours > 720
    ) {
      throw new PartnerOperationsError(
        'INVALID_CANCELLATION_CUTOFF',
        'Cancellation cutoff must be between 0 and 720 hours.',
      );
    }
    return prisma.partnerRatePlan.create({
      data: {
        cancellationDescription: normalizeText(input.cancellationDescription, 300),
        freeCancellationHours: input.freeCancellationHours,
        maximumStayNights: input.maximumStayNights,
        mealPlan: input.mealPlan,
        minimumStayNights: input.minimumStayNights,
        name: normalizeText(input.name, 100),
        nightlyRate: input.nightlyRate,
        ratePlanId: createRatePlanCode(room.roomTypeId, input.name),
        refundable: input.refundable,
        roomId: room.id,
        taxesAndFees: input.taxesAndFees,
      },
    });
  },

  async createPhysicalRoom(
    partnerId: string,
    propertyId: string,
    roomTypeId: string,
    input: { floorLabel: string; notes: string; roomNumber: string },
  ) {
    const roomType = await prisma.partnerRoomType.findFirst({
      include: { physicalRooms: { where: { operationalStatus: 'ACTIVE' } } },
      where: {
        id: roomTypeId,
        propertyId,
        property: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
        status: 'ACTIVE',
      },
    });
    if (!roomType)
      throw new PartnerOperationsError('ROOM_NOT_FOUND', 'The room type was not found.');
    const roomNumber = normalizeText(input.roomNumber, 20);
    if (!/^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,19}$/.test(roomNumber)) {
      throw new PartnerOperationsError(
        'INVALID_ROOM_NUMBER',
        'Use a valid room number up to 20 characters.',
      );
    }
    if (roomType.physicalRooms.length >= roomType.inventoryCount) {
      throw new PartnerOperationsError(
        'PHYSICAL_ROOM_LIMIT',
        'Registered physical rooms cannot exceed this room type inventory.',
      );
    }
    const duplicate = await prisma.partnerPhysicalRoom.findUnique({
      where: { propertyId_roomNumber: { propertyId, roomNumber } },
    });
    if (duplicate) {
      throw new PartnerOperationsError(
        'ROOM_NUMBER_EXISTS',
        'That room number is already registered at this property.',
      );
    }
    return prisma.partnerPhysicalRoom.create({
      data: {
        floorLabel: normalizeText(input.floorLabel, 40),
        notes: normalizeText(input.notes, 300),
        propertyId,
        roomNumber,
        roomTypeId,
      },
    });
  },

  async updatePhysicalRoom(
    partnerId: string,
    propertyId: string,
    roomTypeId: string,
    physicalRoomId: string,
    input: {
      housekeepingStatus: 'CLEANING' | 'DIRTY' | 'READY';
      operationalStatus: 'ACTIVE' | 'OUT_OF_SERVICE';
    },
  ) {
    const physicalRoom = await prisma.partnerPhysicalRoom.findFirst({
      where: {
        id: physicalRoomId,
        propertyId,
        roomTypeId,
        property: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
      },
    });
    if (!physicalRoom) {
      throw new PartnerOperationsError(
        'PHYSICAL_ROOM_NOT_FOUND',
        'The registered room was not found.',
      );
    }
    if (physicalRoom.operationalStatus !== 'ACTIVE' && input.operationalStatus === 'ACTIVE') {
      const [roomType, activeRoomCount] = await Promise.all([
        prisma.partnerRoomType.findUnique({ where: { id: roomTypeId } }),
        prisma.partnerPhysicalRoom.count({
          where: { operationalStatus: 'ACTIVE', roomTypeId },
        }),
      ]);
      if (!roomType || activeRoomCount >= roomType.inventoryCount) {
        throw new PartnerOperationsError(
          'PHYSICAL_ROOM_LIMIT',
          'Increase the room type inventory before returning this physical room to service.',
        );
      }
    }
    return prisma.partnerPhysicalRoom.update({
      data: {
        housekeepingStatus: input.housekeepingStatus,
        operationalStatus: input.operationalStatus,
      },
      where: { id: physicalRoom.id },
    });
  },

  async updateRoomType(
    partnerId: string,
    propertyId: string,
    roomId: string,
    input: {
      amenities: string[];
      bedDescription: string;
      description: string;
      inventoryCount: number;
      imageUrl: string;
      maximumAdults: number;
      maximumChildren: number;
      maximumGuests: number;
      name: string;
    },
  ) {
    const room = await prisma.partnerRoomType.findFirst({
      where: {
        id: roomId,
        propertyId,
        property: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
        status: 'ACTIVE',
      },
    });
    if (!room) throw new PartnerOperationsError('ROOM_NOT_FOUND', 'The room type was not found.');
    if (
      input.name.trim().length < 2 ||
      input.bedDescription.trim().length < 2 ||
      input.description.trim().length < 20
    ) {
      throw new PartnerOperationsError(
        'INVALID_ROOM',
        'Complete the room name, bed, and description.',
      );
    }
    if (
      !Number.isInteger(input.inventoryCount) ||
      input.inventoryCount < 1 ||
      input.inventoryCount > 500
    ) {
      throw new PartnerOperationsError(
        'INVALID_ROOM_COUNT',
        'Room inventory must be between 1 and 500.',
      );
    }
    const registeredRoomCount = await prisma.partnerPhysicalRoom.count({
      where: { operationalStatus: 'ACTIVE', roomTypeId: room.id },
    });
    if (input.inventoryCount < registeredRoomCount) {
      throw new PartnerOperationsError(
        'REGISTERED_ROOM_COUNT_EXCEEDED',
        `Inventory cannot be lower than the ${registeredRoomCount} active physical rooms already registered.`,
      );
    }
    if (
      !Number.isInteger(input.maximumAdults) ||
      input.maximumAdults < 1 ||
      input.maximumAdults > 20 ||
      !Number.isInteger(input.maximumChildren) ||
      input.maximumChildren < 0 ||
      input.maximumChildren > 20 ||
      !Number.isInteger(input.maximumGuests) ||
      input.maximumGuests < input.maximumAdults ||
      input.maximumGuests > 30
    ) {
      throw new PartnerOperationsError(
        'INVALID_OCCUPANCY',
        'Enter a valid adult, child, and maximum guest capacity.',
      );
    }
    return prisma.partnerRoomType.update({
      data: {
        amenitiesJson: JSON.stringify(normalizeHotelAmenityList(input.amenities).slice(0, 50)),
        bedDescription: normalizeText(input.bedDescription, 160),
        description: normalizeText(input.description, 800),
        inventoryCount: input.inventoryCount,
        imageUrl: validateImageUrl(input.imageUrl, room.imageUrl),
        maximumAdults: input.maximumAdults,
        maximumChildren: input.maximumChildren,
        maximumGuests: input.maximumGuests,
        name: normalizeText(input.name, 120),
      },
      include: { ratePlans: { orderBy: { createdAt: 'asc' } } },
      where: { id: room.id },
    });
  },

  async setRoomTypeStatus(
    partnerId: string,
    propertyId: string,
    roomId: string,
    action: 'PAUSE' | 'RESTORE',
  ) {
    const property = await prisma.partnerProperty.findFirst({
      include: { rooms: { where: { status: 'ACTIVE' } } },
      where: { id: propertyId, listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    });
    if (!property)
      throw new PartnerOperationsError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
    const room = await prisma.partnerRoomType.findFirst({ where: { id: roomId, propertyId } });
    if (!room) throw new PartnerOperationsError('ROOM_NOT_FOUND', 'The room type was not found.');
    if (action === 'PAUSE') {
      if (room.status !== 'ACTIVE')
        throw new PartnerOperationsError('ROOM_ALREADY_PAUSED', 'The room type is already paused.');
      if (property.publicationStatus === 'PUBLISHED' && property.rooms.length === 1) {
        throw new PartnerOperationsError(
          'LAST_ACTIVE_ROOM',
          'Pause property sales or restore another room before pausing its final active room.',
        );
      }
      return prisma.partnerRoomType.update({ data: { status: 'PAUSED' }, where: { id: room.id } });
    }
    if (room.status !== 'PAUSED')
      throw new PartnerOperationsError('ROOM_NOT_PAUSED', 'The room type is not paused.');
    const activeRateCount = await prisma.partnerRatePlan.count({
      where: { roomId: room.id, status: 'ACTIVE' },
    });
    if (activeRateCount === 0) {
      throw new PartnerOperationsError(
        'ACTIVE_RATE_REQUIRED',
        'Restore or add an active rate before restoring this room.',
      );
    }
    return prisma.partnerRoomType.update({ data: { status: 'ACTIVE' }, where: { id: room.id } });
  },

  async pauseRatePlan(
    partnerId: string,
    propertyId: string,
    roomId: string,
    ratePlanRecordId: string,
  ) {
    const room = await prisma.partnerRoomType.findFirst({
      include: { ratePlans: { where: { status: 'ACTIVE' } } },
      where: {
        id: roomId,
        propertyId,
        property: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
        status: 'ACTIVE',
      },
    });
    if (!room) throw new PartnerOperationsError('ROOM_NOT_FOUND', 'The room type was not found.');
    const ratePlan = room.ratePlans.find((candidate) => candidate.id === ratePlanRecordId);
    if (!ratePlan)
      throw new PartnerOperationsError(
        'RATE_PLAN_NOT_FOUND',
        'The active rate plan was not found.',
      );
    if (room.ratePlans.length === 1) {
      throw new PartnerOperationsError(
        'LAST_RATE_PLAN',
        'Add another active rate plan before pausing this one.',
      );
    }
    return prisma.partnerRatePlan.update({
      data: { status: 'PAUSED' },
      where: { id: ratePlan.id },
    });
  },

  async restoreRatePlan(
    partnerId: string,
    propertyId: string,
    roomId: string,
    ratePlanRecordId: string,
  ) {
    const ratePlan = await prisma.partnerRatePlan.findFirst({
      include: { room: { include: { property: true } } },
      where: { id: ratePlanRecordId, roomId, status: 'PAUSED' },
    });
    if (
      !ratePlan ||
      ratePlan.room.propertyId !== propertyId ||
      ratePlan.room.property.partnerId !== partnerId ||
      ratePlan.room.property.listingSource !== 'MANAGED' ||
      ratePlan.room.property.status !== 'ACTIVE'
    ) {
      throw new PartnerOperationsError(
        'RATE_PLAN_NOT_FOUND',
        'The paused rate plan was not found.',
      );
    }
    const activeCount = await prisma.partnerRatePlan.count({ where: { roomId, status: 'ACTIVE' } });
    if (activeCount >= 8)
      throw new PartnerOperationsError(
        'RATE_PLAN_LIMIT',
        'A room can have up to 8 active rate plans.',
      );
    return prisma.partnerRatePlan.update({
      data: { status: 'ACTIVE' },
      where: { id: ratePlan.id },
    });
  },

  async updateRatePlan(
    partnerId: string,
    propertyId: string,
    roomId: string,
    ratePlanRecordId: string,
    input: {
      cancellationDescription: string;
      freeCancellationHours: number;
      maximumStayNights: number;
      mealPlan: string;
      minimumStayNights: number;
      name: string;
      nightlyRate: number;
      refundable: boolean;
      taxesAndFees: number;
    },
  ) {
    const ratePlan = await prisma.partnerRatePlan.findFirst({
      include: { room: { include: { property: true } } },
      where: { id: ratePlanRecordId, roomId },
    });
    if (
      !ratePlan ||
      ratePlan.room.propertyId !== propertyId ||
      ratePlan.room.property.partnerId !== partnerId ||
      ratePlan.room.property.listingSource !== 'MANAGED' ||
      ratePlan.room.property.status !== 'ACTIVE'
    ) {
      throw new PartnerOperationsError('RATE_PLAN_NOT_FOUND', 'The rate plan was not found.');
    }
    if (input.name.trim().length < 2 || input.cancellationDescription.trim().length < 10) {
      throw new PartnerOperationsError(
        'INVALID_RATE_PLAN',
        'Complete the rate plan and cancellation details.',
      );
    }
    if (
      !Number.isInteger(input.nightlyRate) ||
      input.nightlyRate < 100 ||
      input.nightlyRate > 5_000_000 ||
      !Number.isInteger(input.taxesAndFees) ||
      input.taxesAndFees < 0 ||
      input.taxesAndFees > 1_000_000
    )
      throw new PartnerOperationsError(
        'INVALID_RATE',
        'Enter a valid nightly rate and taxes in INR.',
      );
    if (
      !Number.isInteger(input.minimumStayNights) ||
      input.minimumStayNights < 1 ||
      input.minimumStayNights > 30 ||
      !Number.isInteger(input.maximumStayNights) ||
      input.maximumStayNights < input.minimumStayNights ||
      input.maximumStayNights > 90
    )
      throw new PartnerOperationsError(
        'INVALID_STAY_RESTRICTION',
        'Stay limits must be between 1 and 90 nights.',
      );
    if (!['room-only', 'breakfast-included', 'half-board', 'full-board'].includes(input.mealPlan)) {
      throw new PartnerOperationsError('INVALID_MEAL_PLAN', 'Choose a valid meal plan.');
    }
    if (
      !Number.isInteger(input.freeCancellationHours) ||
      input.freeCancellationHours < 0 ||
      input.freeCancellationHours > 720
    ) {
      throw new PartnerOperationsError(
        'INVALID_CANCELLATION_CUTOFF',
        'Cancellation cutoff must be between 0 and 720 hours.',
      );
    }
    return prisma.partnerRatePlan.update({
      data: {
        cancellationDescription: normalizeText(input.cancellationDescription, 300),
        freeCancellationHours: input.freeCancellationHours,
        maximumStayNights: input.maximumStayNights,
        mealPlan: input.mealPlan,
        minimumStayNights: input.minimumStayNights,
        name: normalizeText(input.name, 100),
        nightlyRate: input.nightlyRate,
        refundable: input.refundable,
        taxesAndFees: input.taxesAndFees,
      },
      where: { id: ratePlan.id },
    });
  },

  async setPropertyPublication(partnerId: string, propertyId: string, action: 'PAUSE' | 'PUBLISH') {
    const property = await prisma.partnerProperty.findFirst({
      include: { rooms: { where: { status: 'ACTIVE' } } },
      where: { id: propertyId, listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    });
    if (!property)
      throw new PartnerOperationsError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
    if (action === 'PUBLISH' && property.rooms.length === 0) {
      throw new PartnerOperationsError(
        'ROOM_REQUIRED',
        'Add at least one active room type before publishing.',
      );
    }
    if (action === 'PUBLISH' && property.approvalStatus !== 'APPROVED') {
      throw new PartnerOperationsError(
        'PROPERTY_APPROVAL_REQUIRED',
        'Submit this property for platform review before publishing it to hotel search.',
      );
    }
    return prisma.partnerProperty.update({
      data: { publicationStatus: action === 'PUBLISH' ? 'PUBLISHED' : 'PAUSED' },
      where: { id: property.id },
    });
  },

  async updatePropertyLocation(
    partnerId: string,
    propertyId: string,
    input: {
      city: string;
      district: string;
      locality: string;
      locationAliases: string[];
      state: string;
      tehsil: string;
    },
  ) {
    if (
      input.locality.trim().length < 2 ||
      input.city.trim().length < 2 ||
      input.district.trim().length < 2 ||
      input.state.trim().length < 2
    ) {
      throw new PartnerOperationsError(
        'INVALID_PROPERTY_LOCATION',
        'Enter the locality, town or city, district, and state.',
      );
    }
    const property = await prisma.partnerProperty.findFirst({
      where: { id: propertyId, listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    });
    if (!property) {
      throw new PartnerOperationsError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
    }
    return prisma.partnerProperty.update({
      data: {
        approvalNote: '',
        approvalStatus: 'PENDING_REVIEW',
        city: normalizeText(input.city, 80),
        district: normalizeText(input.district, 80),
        locality: normalizeText(input.locality, 100),
        locationAliasesJson: JSON.stringify(normalizedList(input.locationAliases, 20)),
        publicationStatus: 'DRAFT',
        reviewedAt: null,
        reviewedByUserId: null,
        state: normalizeText(input.state, 80),
        submittedAt: null,
        tehsil: normalizeText(input.tehsil, 80),
      },
      where: { id: property.id },
    });
  },

  async submitPropertyForReview(partnerId: string, propertyId: string) {
    const property = await prisma.partnerProperty.findFirst({
      include: { rooms: { where: { status: 'ACTIVE' } } },
      where: { id: propertyId, listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    });
    if (!property) {
      throw new PartnerOperationsError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
    }
    if (property.rooms.length === 0) {
      throw new PartnerOperationsError(
        'ROOM_REQUIRED',
        'Add at least one active room type before review.',
      );
    }
    if (property.approvalStatus === 'APPROVED') {
      throw new PartnerOperationsError(
        'PROPERTY_ALREADY_APPROVED',
        'This property is already approved.',
      );
    }
    const findings = evaluatePropertyListingRisk(property);
    return prisma.$transaction(async (transaction) => {
      const updated = await transaction.partnerProperty.update({
        data: {
          approvalNote: '',
          approvalStatus: 'PENDING_REVIEW',
          publicationStatus: 'DRAFT',
          reviewedAt: null,
          reviewedByUserId: null,
          submittedAt: new Date(),
        },
        where: { id: property.id },
      });
      await transaction.riskSignal.deleteMany({
        where: {
          source: 'SUPPLIER_LISTING_RULES_V1',
          status: 'OPEN',
          subjectId: property.id,
          subjectType: 'PARTNER_PROPERTY',
        },
      });
      for (const finding of findings) {
        await transaction.riskSignal.create({
          data: {
            evidenceJson: JSON.stringify({ propertyId: property.id, rule: finding.code }),
            severity: finding.severity,
            signalType: finding.code,
            source: 'SUPPLIER_LISTING_RULES_V1',
            subjectId: property.id,
            subjectType: 'PARTNER_PROPERTY',
            summary: finding.summary,
          },
        });
      }
      return updated;
    });
  },

  async updatePropertyProfile(
    partnerId: string,
    propertyId: string,
    input: {
      checkInTime: string;
      checkOutTime: string;
      contactEmail: string;
      contactPhone: string;
      description: string;
      displayName: string;
      minimumCheckInAge: number;
      propertyType: string;
      starRating: number;
    },
  ) {
    const property = await prisma.partnerProperty.findFirst({
      where: { id: propertyId, listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    });
    if (!property)
      throw new PartnerOperationsError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
    if (input.displayName.trim().length < 2 || input.description.trim().length < 30) {
      throw new PartnerOperationsError(
        'INVALID_PROPERTY_PROFILE',
        'Complete the property name and description.',
      );
    }
    if (
      !['HOTEL', 'RESORT', 'HOMESTAY', 'GUEST_HOUSE', 'APARTMENT', 'HOSTEL'].includes(
        input.propertyType,
      )
    ) {
      throw new PartnerOperationsError('INVALID_PROPERTY_TYPE', 'Choose a valid property type.');
    }
    if (!Number.isInteger(input.starRating) || input.starRating < 1 || input.starRating > 5) {
      throw new PartnerOperationsError(
        'INVALID_STAR_RATING',
        'Star rating must be between 1 and 5.',
      );
    }
    if (!/^\S+@\S+\.\S+$/.test(input.contactEmail.trim()) || input.contactPhone.trim().length < 7) {
      throw new PartnerOperationsError(
        'INVALID_PROPERTY_CONTACT',
        'Enter a valid guest-facing email and phone number.',
      );
    }
    if (!/^\d{2}:\d{2}$/.test(input.checkInTime) || !/^\d{2}:\d{2}$/.test(input.checkOutTime)) {
      throw new PartnerOperationsError(
        'INVALID_PROPERTY_TIME',
        'Enter valid check-in and check-out times.',
      );
    }
    if (
      !Number.isInteger(input.minimumCheckInAge) ||
      input.minimumCheckInAge < 16 ||
      input.minimumCheckInAge > 30
    ) {
      throw new PartnerOperationsError(
        'INVALID_CHECK_IN_AGE',
        'Minimum check-in age must be between 16 and 30.',
      );
    }
    return prisma.partnerProperty.update({
      data: {
        approvalNote: '',
        approvalStatus: 'PENDING_REVIEW',
        checkInTime: input.checkInTime,
        checkOutTime: input.checkOutTime,
        contactEmail: normalizeText(input.contactEmail, 254).toLowerCase(),
        contactPhone: normalizeText(input.contactPhone, 30),
        description: normalizeText(input.description, 1500),
        displayName: normalizeText(input.displayName, 140),
        minimumCheckInAge: input.minimumCheckInAge,
        publicationStatus: 'DRAFT',
        propertyType: input.propertyType,
        reviewedAt: null,
        reviewedByUserId: null,
        starRating: input.starRating,
        submittedAt: null,
      },
      where: { id: property.id },
    });
  },

  async updatePropertyContent(
    partnerId: string,
    propertyId: string,
    input: {
      amenities: string[];
      childrenAllowed: boolean;
      imageUrl: string;
      imageUrls: string[];
      languages: string[];
      landmarks: string[];
      petsAllowed: boolean;
      policies: string[];
      smokingAllowed: boolean;
    },
  ) {
    const property = await prisma.partnerProperty.findFirst({
      where: { id: propertyId, listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    });
    if (!property)
      throw new PartnerOperationsError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
    const imageUrl = validateImageUrl(input.imageUrl, property.imageUrl);
    const imageUrls = normalizedList(input.imageUrls, 12).map((url) =>
      validateImageUrl(url, property.imageUrl),
    );
    return prisma.partnerProperty.update({
      data: {
        approvalNote: '',
        approvalStatus: 'PENDING_REVIEW',
        amenitiesJson: JSON.stringify(normalizeHotelAmenityList(input.amenities).slice(0, 100)),
        childrenAllowed: input.childrenAllowed,
        imageUrl,
        imageUrlsJson: JSON.stringify(imageUrls),
        languagesJson: JSON.stringify(normalizedList(input.languages, 12)),
        landmarksJson: JSON.stringify(normalizedList(input.landmarks, 12)),
        petsAllowed: input.petsAllowed,
        policiesJson: JSON.stringify(normalizedList(input.policies, 20)),
        publicationStatus: 'DRAFT',
        reviewedAt: null,
        reviewedByUserId: null,
        smokingAllowed: input.smokingAllowed,
        submittedAt: null,
      },
      where: { id: property.id },
    });
  },

  async setHotelCalendar(input: {
    availableRooms: number;
    closedToArrival: boolean;
    closedToDeparture: boolean;
    clearNightlyRate: boolean;
    endDate: string;
    nightlyRate?: number;
    maximumStayNights?: number;
    minimumStayNights?: number;
    note: string;
    partnerId: string;
    propertyId: string;
    ratePlanRecordId?: string;
    roomTypeId: string;
    startDate: string;
    stopSell: boolean;
  }) {
    const property = await prisma.partnerProperty.findFirst({
      where: { id: input.propertyId, partnerId: input.partnerId, status: 'ACTIVE' },
    });
    if (!property) {
      throw new PartnerOperationsError(
        'PROPERTY_NOT_FOUND',
        'The assigned property was not found.',
      );
    }
    if (
      !Number.isInteger(input.availableRooms) ||
      input.availableRooms < 0 ||
      input.availableRooms > 500
    ) {
      throw new PartnerOperationsError(
        'INVALID_ROOM_COUNT',
        'Available rooms must be between 0 and 500.',
      );
    }
    if (
      input.nightlyRate !== undefined &&
      (!Number.isInteger(input.nightlyRate) ||
        input.nightlyRate < 100 ||
        input.nightlyRate > 5_000_000)
    ) {
      throw new PartnerOperationsError(
        'INVALID_RATE',
        'Nightly rate must be between ₹100 and ₹50,00,000.',
      );
    }
    const room = await prisma.partnerRoomType.findFirst({
      include: { ratePlans: true },
      where: { propertyId: property.id, roomTypeId: input.roomTypeId, status: 'ACTIVE' },
    });
    if (!room) {
      throw new PartnerOperationsError('ROOM_NOT_FOUND', 'The active room type was not found.');
    }
    const ratePlan = input.ratePlanRecordId
      ? room.ratePlans.find(
          (candidate) => candidate.id === input.ratePlanRecordId && candidate.status === 'ACTIVE',
        )
      : undefined;
    if ((input.nightlyRate !== undefined || input.clearNightlyRate) && !ratePlan) {
      throw new PartnerOperationsError(
        'RATE_PLAN_REQUIRED',
        'Select an active rate plan before setting a seasonal nightly rate.',
      );
    }
    if (
      input.minimumStayNights !== undefined &&
      (!Number.isInteger(input.minimumStayNights) ||
        input.minimumStayNights < 1 ||
        input.minimumStayNights > 30)
    ) {
      throw new PartnerOperationsError(
        'INVALID_MINIMUM_STAY',
        'Minimum stay must be between 1 and 30 nights.',
      );
    }
    if (
      input.maximumStayNights !== undefined &&
      (!Number.isInteger(input.maximumStayNights) ||
        input.maximumStayNights < (input.minimumStayNights ?? 1) ||
        input.maximumStayNights > 90)
    ) {
      throw new PartnerOperationsError(
        'INVALID_MAXIMUM_STAY',
        'Maximum stay must be between the minimum stay and 90 nights.',
      );
    }
    const dates = enumerateDates(input.startDate, input.endDate);
    await prisma.$transaction(
      dates.map((stayDate) =>
        prisma.partnerHotelInventoryDay.upsert({
          create: {
            availableRooms: input.availableRooms,
            closedToArrival: input.closedToArrival,
            closedToDeparture: input.closedToDeparture,
            maximumStayNights: input.maximumStayNights,
            minimumStayNights: input.minimumStayNights,
            note: normalizeText(input.note, 200),
            propertyId: property.id,
            roomTypeId: input.roomTypeId,
            stayDate,
            stopSell: input.stopSell,
          },
          update: {
            availableRooms: input.availableRooms,
            closedToArrival: input.closedToArrival,
            closedToDeparture: input.closedToDeparture,
            maximumStayNights: input.maximumStayNights,
            minimumStayNights: input.minimumStayNights,
            note: normalizeText(input.note, 200),
            stopSell: input.stopSell,
          },
          where: {
            propertyId_roomTypeId_stayDate: {
              propertyId: property.id,
              roomTypeId: input.roomTypeId,
              stayDate,
            },
          },
        }),
      ),
    );
    if (ratePlan && input.nightlyRate !== undefined) {
      await prisma.$transaction(
        dates.map((stayDate) =>
          prisma.partnerRatePlanInventoryDay.upsert({
            create: {
              nightlyRate: input.nightlyRate as number,
              note: normalizeText(input.note, 200),
              ratePlanId: ratePlan.id,
              stayDate,
            },
            update: {
              nightlyRate: input.nightlyRate as number,
              note: normalizeText(input.note, 200),
            },
            where: { ratePlanId_stayDate: { ratePlanId: ratePlan.id, stayDate } },
          }),
        ),
      );
    }
    if (ratePlan && input.clearNightlyRate) {
      await prisma.partnerRatePlanInventoryDay.deleteMany({
        where: { ratePlanId: ratePlan.id, stayDate: { in: dates } },
      });
    }
    return dates.length;
  },

  async createVehicle(
    partnerId: string,
    input: {
      bags: number;
      cancellationPolicy: string;
      category: string;
      features: string[];
      fuelPolicy: string;
      mileagePolicy: string;
      pickupLocation: string;
      dropoffLocation: string;
      pricePerDay: number;
      registrationNumber?: string;
      seats: number;
      totalUnits: number;
      transmission: string;
      vehicleName: string;
    },
  ) {
    if (
      !['Automatic', 'Manual'].includes(input.transmission) ||
      !Number.isInteger(input.seats) ||
      input.seats < 1 ||
      input.seats > 20 ||
      !Number.isInteger(input.bags) ||
      input.bags < 0 ||
      input.bags > 20
    ) {
      throw new PartnerOperationsError(
        'INVALID_VEHICLE',
        'Enter a valid transmission, seat count, and baggage capacity.',
      );
    }
    if (
      [
        input.vehicleName,
        input.category,
        input.pickupLocation,
        input.dropoffLocation,
        input.fuelPolicy,
        input.mileagePolicy,
        input.cancellationPolicy,
      ].some((value) => value.trim().length < 2)
    ) {
      throw new PartnerOperationsError(
        'INVALID_VEHICLE',
        'Complete the vehicle, operating location, and rental policy details.',
      );
    }
    if (
      !Number.isInteger(input.pricePerDay) ||
      input.pricePerDay < 100 ||
      input.pricePerDay > 1_000_000
    ) {
      throw new PartnerOperationsError(
        'INVALID_PRICE',
        'Daily price must be between ₹100 and ₹10,00,000.',
      );
    }
    if (!Number.isInteger(input.totalUnits) || input.totalUnits < 1 || input.totalUnits > 500) {
      throw new PartnerOperationsError(
        'INVALID_FLEET_SIZE',
        'Fleet units must be between 1 and 500.',
      );
    }
    const registrationNumber = input.registrationNumber
      ? normalizeText(input.registrationNumber, 30).toUpperCase()
      : null;
    const findings = evaluateVehicleListingRisk({ ...input, registrationNumber });
    if (
      registrationNumber &&
      (await prisma.partnerVehicle.findFirst({
        select: { id: true },
        where: { registrationNumber, status: { not: 'ARCHIVED' } },
      }))
    ) {
      findings.push({
        code: 'VEHICLE_REGISTRATION_DUPLICATE',
        severity: 'HIGH',
        summary:
          'This registration number already exists in another active or paused fleet record.',
      });
    }
    return prisma.$transaction(async (transaction) => {
      const vehicle = await transaction.partnerVehicle.create({
        data: {
          approvalStatus: 'PENDING_REVIEW',
          bags: input.bags,
          cancellationPolicy: normalizeText(input.cancellationPolicy, 240),
          category: normalizeText(input.category, 80),
          code: createVehicleCode(partnerId, input.vehicleName),
          dropoffLocation: normalizeText(input.dropoffLocation, 80),
          featuresJson: JSON.stringify(
            input.features
              .map((feature) => normalizeText(feature, 60))
              .filter(Boolean)
              .slice(0, 12),
          ),
          fuelPolicy: normalizeText(input.fuelPolicy, 120),
          mileagePolicy: normalizeText(input.mileagePolicy, 120),
          partnerId,
          pickupLocation: normalizeText(input.pickupLocation, 80),
          pricePerDay: input.pricePerDay,
          publicationStatus: 'DRAFT',
          registrationNumber,
          seats: input.seats,
          totalUnits: input.totalUnits,
          submittedAt: new Date(),
          transmission: input.transmission,
          vehicleName: normalizeText(input.vehicleName, 120),
        },
      });
      for (const finding of findings) {
        await transaction.riskSignal.create({
          data: {
            evidenceJson: JSON.stringify({ rule: finding.code, vehicleId: vehicle.id }),
            severity: finding.severity,
            signalType: finding.code,
            source: 'SUPPLIER_LISTING_RULES_V1',
            subjectId: vehicle.id,
            subjectType: 'PARTNER_VEHICLE',
            summary: finding.summary,
          },
        });
      }
      return vehicle;
    });
  },

  async setVehicleCalendar(input: {
    availableUnits: number;
    endDate: string;
    note: string;
    partnerId: string;
    pricePerDay?: number;
    startDate: string;
    stopSell: boolean;
    vehicleId: string;
  }) {
    const vehicle = await prisma.partnerVehicle.findFirst({
      where: { id: input.vehicleId, partnerId: input.partnerId },
    });
    if (!vehicle)
      throw new PartnerOperationsError('VEHICLE_NOT_FOUND', 'The vehicle was not found.');
    if (
      !Number.isInteger(input.availableUnits) ||
      input.availableUnits < 0 ||
      input.availableUnits > vehicle.totalUnits
    ) {
      throw new PartnerOperationsError(
        'INVALID_AVAILABILITY',
        `Available units must be between 0 and ${vehicle.totalUnits}.`,
      );
    }
    if (
      input.pricePerDay !== undefined &&
      (!Number.isInteger(input.pricePerDay) ||
        input.pricePerDay < 100 ||
        input.pricePerDay > 1_000_000)
    ) {
      throw new PartnerOperationsError(
        'INVALID_PRICE',
        'Daily price must be between ₹100 and ₹10,00,000.',
      );
    }
    const dates = enumerateDates(input.startDate, input.endDate);
    await prisma.$transaction(
      dates.map((serviceDate) =>
        prisma.partnerVehicleInventoryDay.upsert({
          create: {
            availableUnits: input.availableUnits,
            note: normalizeText(input.note, 200),
            pricePerDay: input.pricePerDay,
            serviceDate,
            stopSell: input.stopSell,
            vehicleId: vehicle.id,
          },
          update: {
            availableUnits: input.availableUnits,
            note: normalizeText(input.note, 200),
            pricePerDay: input.pricePerDay,
            stopSell: input.stopSell,
          },
          where: { vehicleId_serviceDate: { serviceDate, vehicleId: vehicle.id } },
        }),
      ),
    );
    return dates.length;
  },

  async reserveDirectVehicle(
    transaction: Prisma.TransactionClient,
    input: {
      confirmationCode: string;
      customerEmail: string;
      customerName: string;
      customerTripId: string;
      dropoffDate: string;
      offerId: string;
      pickupDate: string;
      totalAmount: number;
    },
  ) {
    if (!input.offerId.startsWith('direct-')) return null;
    const dates = enumerateDates(input.pickupDate, input.dropoffDate);
    const vehicle = await transaction.partnerVehicle.findUnique({
      include: {
        inventoryDays: {
          where: { serviceDate: { gte: input.pickupDate, lt: input.dropoffDate } },
        },
        partner: { select: { status: true } },
        reservations: {
          where: {
            dropoffDate: { gt: input.pickupDate },
            pickupDate: { lt: input.dropoffDate },
            status: { in: OCCUPYING_VEHICLE_RESERVATION_STATUSES },
          },
        },
      },
      where: { code: input.offerId },
    });
    if (!vehicle || !vehicleMayBePublished(vehicle) || vehicle.partner.status !== 'ACTIVE') {
      throw new PartnerOperationsError(
        'VEHICLE_UNAVAILABLE',
        'This direct supplier vehicle is no longer available.',
      );
    }
    for (const serviceDate of dates) {
      const calendar = vehicle.inventoryDays.find((day) => day.serviceDate === serviceDate);
      const availableUnits = calendar?.availableUnits ?? vehicle.totalUnits;
      const reservedUnits = reservationUnitsForDate(vehicle.reservations, serviceDate);
      if (calendar?.stopSell || availableUnits - reservedUnits < 1) {
        throw new PartnerOperationsError(
          'VEHICLE_SOLD_OUT',
          'The selected vehicle was just reserved. Please choose another available car.',
        );
      }
    }
    const reservation = await transaction.partnerVehicleReservation.create({
      data: {
        confirmationCode: input.confirmationCode,
        customerEmail: input.customerEmail,
        customerName: normalizeText(input.customerName, 120),
        customerTripId: input.customerTripId,
        dropoffDate: input.dropoffDate,
        partnerId: vehicle.partnerId,
        pickupDate: input.pickupDate,
        totalAmount: input.totalAmount,
        vehicleId: vehicle.id,
      },
    });
    await transaction.partnerAuditLog.create({
      data: {
        action: 'VEHICLE_RESERVED',
        entityId: reservation.id,
        entityType: 'VEHICLE_RESERVATION',
        metadataJson: JSON.stringify({
          confirmationCode: input.confirmationCode,
          dropoffDate: input.dropoffDate,
          pickupDate: input.pickupDate,
          vehicleCode: vehicle.code,
        }),
        partnerId: vehicle.partnerId,
        summary: `${vehicle.vehicleName} reserved for ${input.pickupDate}.`,
      },
    });
    return reservation;
  },

  async updateVehicleCompliance(
    input: VehicleComplianceDates & { partnerId: string; vehicleId: string },
  ) {
    const vehicle = await prisma.partnerVehicle.findFirst({
      select: { id: true, registrationNumber: true, vehicleName: true },
      where: { id: input.vehicleId, partnerId: input.partnerId },
    });
    if (!vehicle)
      throw new PartnerOperationsError('VEHICLE_NOT_FOUND', 'The vehicle was not found.');
    if (!vehicle.registrationNumber)
      throw new PartnerOperationsError(
        'REGISTRATION_REQUIRED',
        'Add a vehicle registration number before recording compliance dates.',
      );
    const dates = normalizeVehicleComplianceDates({
      fitnessExpiry: input.fitnessExpiry,
      insuranceExpiry: input.insuranceExpiry,
      permitExpiry: input.permitExpiry,
      pollutionExpiry: input.pollutionExpiry,
      registrationExpiry: input.registrationExpiry,
    });
    return prisma.partnerVehicle.update({ data: dates, where: { id: vehicle.id } });
  },

  async updateVehicleStatus(input: {
    partnerId: string;
    status: 'ACTIVE' | 'PAUSED';
    today: string;
    vehicleId: string;
  }) {
    const vehicle = await prisma.partnerVehicle.findFirst({
      where: { id: input.vehicleId, partnerId: input.partnerId },
    });
    if (!vehicle)
      throw new PartnerOperationsError('VEHICLE_NOT_FOUND', 'The vehicle was not found.');
    if (vehicle.status === input.status) return vehicle;
    if (input.status === 'ACTIVE') {
      if (vehicle.approvalStatus !== 'APPROVED') {
        throw new PartnerOperationsError(
          'VEHICLE_APPROVAL_REQUIRED',
          'An administrator must approve this vehicle before it can be restored to sale.',
        );
      }
      if (!vehicle.registrationNumber) {
        throw new PartnerOperationsError(
          'REGISTRATION_REQUIRED',
          'Add the vehicle registration number before restoring sales.',
        );
      }
      const compliance = vehicleComplianceState(vehicle, input.today);
      if (compliance === 'INCOMPLETE' || compliance === 'EXPIRED') {
        throw new PartnerOperationsError(
          'VEHICLE_COMPLIANCE_REQUIRED',
          'Complete all vehicle compliance dates and renew expired documents before restoring sales.',
        );
      }
    }
    return prisma.partnerVehicle.update({
      data: {
        publicationStatus: input.status === 'ACTIVE' ? 'PUBLISHED' : 'PAUSED',
        status: input.status,
      },
      where: { id: vehicle.id },
    });
  },

  async reserveDirectBus(
    transaction: Prisma.TransactionClient,
    input: {
      confirmationCode: string;
      customerEmail: string;
      customerName: string;
      customerTripId: string;
      holdId: string;
      offerId: string;
      passengerCount: number;
      seats: string[];
      serviceDate: string;
      totalAmount: number;
      userId: string;
    },
  ) {
    const prefix = 'direct-bus-trip-';
    if (!input.offerId.startsWith(prefix)) return null;
    const tripId = input.offerId.slice(prefix.length);
    const trip = await transaction.partnerBusTrip.findUnique({
      include: {
        reservations: {
          select: { seatNumbersJson: true },
          where: { status: 'CONFIRMED' },
        },
        route: { include: { partner: { select: { id: true, status: true } } } },
      },
      where: { id: tripId },
    });
    if (
      !trip ||
      trip.status !== 'ACTIVE' ||
      trip.route.status !== 'ACTIVE' ||
      trip.route.partner.status !== 'ACTIVE' ||
      trip.serviceDate !== input.serviceDate
    ) {
      throw new PartnerOperationsError(
        'BUS_TRIP_UNAVAILABLE',
        'This direct operator trip is no longer available.',
      );
    }
    const hold = await transaction.partnerBusSeatHold.findFirst({
      include: { seats: { select: { seatNumber: true } } },
      where: { id: input.holdId, tripId: trip.id, userId: input.userId },
    });
    if (
      !hold ||
      hold.expiresAt <= new Date() ||
      !busSeatSetsMatch(
        hold.seats.map((seat) => seat.seatNumber),
        input.seats,
      )
    ) {
      throw new PartnerOperationsError(
        'BUS_SEAT_HOLD_INVALID',
        'Your seat hold has expired or no longer matches this booking. Please select seats again.',
      );
    }
    if (
      input.seats.length !== input.passengerCount ||
      new Set(input.seats).size !== input.seats.length ||
      !seatsFitBusCapacity(input.seats, trip.seatCapacity)
    ) {
      throw new PartnerOperationsError(
        'INVALID_BUS_SEATS',
        'Choose valid, unique seats within this bus capacity.',
      );
    }
    const occupiedSeats = new Set(
      trip.reservations.flatMap((reservation) => readStoredStringList(reservation.seatNumbersJson)),
    );
    if (input.seats.some((seat) => occupiedSeats.has(seat))) {
      throw new PartnerOperationsError(
        'BUS_SEAT_UNAVAILABLE',
        'One or more selected seats were just reserved. Please choose different seats.',
      );
    }
    if (occupiedSeats.size + input.passengerCount > trip.seatCapacity) {
      throw new PartnerOperationsError(
        'BUS_TRIP_SOLD_OUT',
        'This trip no longer has enough seats for all passengers.',
      );
    }
    const reservation = await transaction.partnerBusReservation.create({
      data: {
        confirmationCode: input.confirmationCode,
        customerEmail: input.customerEmail,
        customerName: normalizeText(input.customerName, 120),
        customerTripId: input.customerTripId,
        passengerCount: input.passengerCount,
        partnerId: trip.route.partner.id,
        seatNumbersJson: JSON.stringify(input.seats),
        totalAmount: input.totalAmount,
        tripId: trip.id,
      },
    });
    const consumedHold = await transaction.partnerBusSeatHold.deleteMany({
      where: { id: hold.id, userId: input.userId },
    });
    if (consumedHold.count !== 1) {
      throw new PartnerOperationsError(
        'BUS_SEAT_HOLD_INVALID',
        'Your seat hold could not be consumed. Please select seats again.',
      );
    }
    await transaction.partnerAuditLog.create({
      data: {
        action: 'BUS_TRIP_RESERVED',
        entityId: reservation.id,
        entityType: 'BUS_RESERVATION',
        metadataJson: JSON.stringify({
          confirmationCode: input.confirmationCode,
          routeCode: trip.route.code,
          seats: input.seats,
          serviceDate: trip.serviceDate,
        }),
        partnerId: trip.route.partner.id,
        summary: `${input.passengerCount} bus seat${input.passengerCount === 1 ? '' : 's'} reserved for ${trip.serviceDate}.`,
      },
    });
    return reservation;
  },

  async getVehicleReservationSummary(partnerId: string) {
    const [totalCount, confirmedCount, captured] = await Promise.all([
      prisma.partnerVehicleReservation.count({ where: { partnerId } }),
      prisma.partnerVehicleReservation.count({
        where: { partnerId, status: { in: OCCUPYING_VEHICLE_RESERVATION_STATUSES } },
      }),
      prisma.partnerVehicleReservation.aggregate({
        _sum: { totalAmount: true },
        where: { partnerId, status: { in: VALUE_VEHICLE_RESERVATION_STATUSES } },
      }),
    ]);
    return {
      capturedInrValue: captured._sum.totalAmount ?? 0,
      confirmedCount,
      totalCount,
    };
  },

  async listVehicleReservations(input: { partnerId: string; skip: number; take: number }) {
    return prisma.partnerVehicleReservation.findMany({
      include: {
        vehicle: {
          select: {
            dropoffLocation: true,
            pickupLocation: true,
            registrationNumber: true,
            vehicleName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: input.skip,
      take: input.take,
      where: { partnerId: input.partnerId },
    });
  },

  async searchDirectVehicles(criteria: CarSearchCriteria): Promise<CarOffer[]> {
    const dates = enumerateDates(criteria.pickupDate, criteria.dropoffDate);
    const vehicles = await prisma.partnerVehicle.findMany({
      include: {
        inventoryDays: {
          where: { serviceDate: { gte: criteria.pickupDate, lt: criteria.dropoffDate } },
        },
        partner: { select: { name: true, status: true } },
        reservations: {
          where: {
            dropoffDate: { gt: criteria.pickupDate },
            pickupDate: { lt: criteria.dropoffDate },
            status: { in: OCCUPYING_VEHICLE_RESERVATION_STATUSES },
          },
        },
      },
      where: {
        approvalStatus: 'APPROVED',
        publicationStatus: 'PUBLISHED',
        status: 'ACTIVE',
      },
    });
    const pickupLocation = criteria.pickupLocation.trim().toLocaleLowerCase();
    const dropoffLocation = criteria.dropoffLocation.trim().toLocaleLowerCase();
    return vehicles
      .filter(
        (vehicle) =>
          vehicle.partner.status === 'ACTIVE' &&
          vehicle.pickupLocation.trim().toLocaleLowerCase() === pickupLocation &&
          vehicle.dropoffLocation.trim().toLocaleLowerCase() === dropoffLocation,
      )
      .map((vehicle) => {
        const availability = dates.map((date) =>
          vehicle.inventoryDays.find((day) => day.serviceDate === date),
        );
        if (availability.some((day) => day?.stopSell)) return null;
        const remaining = Math.min(
          ...dates.map((date, index) =>
            Math.max(
              0,
              (availability[index]?.availableUnits ?? vehicle.totalUnits) -
                reservationUnitsForDate(vehicle.reservations, date),
            ),
          ),
        );
        if (remaining < 1) return null;
        const pricePerDay = Math.max(
          ...availability.map((day) => day?.pricePerDay ?? vehicle.pricePerDay),
        );
        let features: string[] = [];
        try {
          const parsed: unknown = JSON.parse(vehicle.featuresJson);
          if (Array.isArray(parsed))
            features = parsed.filter((value): value is string => typeof value === 'string');
        } catch {
          features = [];
        }
        return {
          bags: vehicle.bags,
          cancellationPolicy: vehicle.cancellationPolicy,
          carsRemaining: remaining,
          category: vehicle.category,
          currency: 'INR' as const,
          dropoffLocation: vehicle.dropoffLocation,
          features,
          fuelPolicy: vehicle.fuelPolicy,
          id: vehicle.code,
          mileagePolicy: vehicle.mileagePolicy,
          pickupLocation: vehicle.pickupLocation,
          pricePerDay,
          providerName: vehicle.partner.name,
          rentalMode: 'self-drive' as const,
          seats: vehicle.seats,
          source: 'Mandyal Direct Supplier',
          totalPrice: 0,
          transmission:
            vehicle.transmission === 'Automatic' ? ('Automatic' as const) : ('Manual' as const),
          vehicleName: vehicle.vehicleName,
        } satisfies CarOffer;
      })
      .filter((offer) => offer !== null);
  },
};
