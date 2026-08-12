import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import type { CarOffer, CarSearchCriteria } from '@/types/car';

const DAY_MS = 86_400_000;
const MAX_CALENDAR_DAYS = 93;

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
  async createApplication(input: {
    applicantUserId: string;
    businessName: string;
    city: string;
    contactEmail: string;
    contactName: string;
    contactPhone: string;
    inventorySummary: string;
    partnerType: string;
  }) {
    if (!['HOTEL', 'CAR'].includes(input.partnerType)) {
      throw new PartnerOperationsError(
        'INVALID_PARTNER_TYPE',
        'Choose hotel or car supplier onboarding.',
      );
    }
    if (
      input.businessName.trim().length < 2 ||
      input.contactName.trim().length < 2 ||
      !input.contactEmail.includes('@') ||
      input.contactPhone.trim().length < 6 ||
      input.city.trim().length < 2 ||
      input.inventorySummary.trim().length < 20
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
        include: { applicant: true },
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
            status: 'REJECTED',
          },
          where: { id: application.id },
        });
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
      return transaction.partnerApplication.update({
        data: {
          partnerId: partner.id,
          reviewedAt: new Date(),
          reviewedByUserId: input.reviewerUserId,
          reviewNote: normalizeText(input.reviewNote, 500),
          status: 'APPROVED',
        },
        where: { id: application.id },
      });
    });
  },

  async setHotelCalendar(input: {
    availableRooms: number;
    endDate: string;
    nightlyRate?: number;
    note: string;
    partnerId: string;
    propertyId: string;
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
    const dates = enumerateDates(input.startDate, input.endDate);
    await prisma.$transaction(
      dates.map((stayDate) =>
        prisma.partnerHotelInventoryDay.upsert({
          create: {
            availableRooms: input.availableRooms,
            nightlyRate: input.nightlyRate,
            note: normalizeText(input.note, 200),
            propertyId: property.id,
            roomTypeId: input.roomTypeId,
            stayDate,
            stopSell: input.stopSell,
          },
          update: {
            availableRooms: input.availableRooms,
            nightlyRate: input.nightlyRate,
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
    return prisma.partnerVehicle.create({
      data: {
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
        registrationNumber: input.registrationNumber
          ? normalizeText(input.registrationNumber, 30).toUpperCase()
          : null,
        seats: input.seats,
        totalUnits: input.totalUnits,
        transmission: input.transmission,
        vehicleName: normalizeText(input.vehicleName, 120),
      },
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
            status: 'CONFIRMED',
          },
        },
      },
      where: { code: input.offerId },
    });
    if (!vehicle || vehicle.status !== 'ACTIVE' || vehicle.partner.status !== 'ACTIVE') {
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

  async getVehicleReservationSummary(partnerId: string) {
    const [totalCount, confirmedCount, captured] = await Promise.all([
      prisma.partnerVehicleReservation.count({ where: { partnerId } }),
      prisma.partnerVehicleReservation.count({ where: { partnerId, status: 'CONFIRMED' } }),
      prisma.partnerVehicleReservation.aggregate({
        _sum: { totalAmount: true },
        where: { partnerId, status: 'CONFIRMED' },
      }),
    ]);
    return {
      capturedInrValue: captured._sum.totalAmount ?? 0,
      confirmedCount,
      totalCount,
    };
  },

  async listVehicleReservations(input: {
    partnerId: string;
    skip: number;
    take: number;
  }) {
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
            status: 'CONFIRMED',
          },
        },
      },
      where: {
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
          seats: vehicle.seats,
          source: 'Mandyal Direct Supplier',
          totalPrice: 0,
          transmission:
            vehicle.transmission === 'Automatic' ? ('Automatic' as const) : ('Manual' as const),
          vehicleName: vehicle.vehicleName,
        } satisfies CarOffer;
      })
      .filter((offer): offer is CarOffer => offer !== null);
  },
};
