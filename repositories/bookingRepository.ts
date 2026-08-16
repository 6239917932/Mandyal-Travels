import type { HotelBookingRecord } from '@/types/commerce';
import type { Prisma } from '@/generated/prisma/client';
import { normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import { createCaptureAccounting } from '@/lib/payments/accounting';
import type { ConfirmedPaymentContext } from '@/services/paymentConfirmationService';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

export type BusinessBookingContext = {
  requestId: string;
  requesterId: string;
};

export type PartnerBookingQuery = {
  arrivalFrom?: string;
  arrivalThrough?: string;
  bookingStatus?: HotelBookingRecord['status'];
  hotelSlugs?: string[];
  operationalStatus?: HotelBookingRecord['operationalStatus'];
  query?: string;
  skip?: number;
  take?: number;
};

function matchesPartnerQuery(booking: HotelBookingRecord, options: PartnerBookingQuery): boolean {
  const query = options.query?.trim().toLowerCase();
  return (
    (!options.hotelSlugs || options.hotelSlugs.includes(booking.hotelSlug)) &&
    (!options.bookingStatus || booking.status === options.bookingStatus) &&
    (!options.operationalStatus || booking.operationalStatus === options.operationalStatus) &&
    (!options.arrivalFrom || booking.checkInDate >= options.arrivalFrom) &&
    (!options.arrivalThrough || booking.checkInDate <= options.arrivalThrough) &&
    (!query ||
      [
        booking.confirmationCode,
        booking.guest.email,
        booking.guest.firstName,
        booking.guest.lastName,
        booking.hotelSlug,
      ].some((value) => value.toLowerCase().includes(query)))
  );
}

function createPartnerBookingWhere(options: PartnerBookingQuery): Prisma.BookingWhereInput {
  const query = options.query?.trim();
  return {
    hotelSlug: options.hotelSlugs ? { in: options.hotelSlugs } : undefined,
    operationalStatus: options.operationalStatus,
    quote:
      options.arrivalFrom || options.arrivalThrough
        ? {
            is: {
              checkInDate: { gte: options.arrivalFrom, lte: options.arrivalThrough },
            },
          }
        : undefined,
    status: options.bookingStatus,
    ...(query
      ? {
          OR: [
            { confirmationCode: { contains: query } },
            { guest: { is: { email: { contains: query } } } },
            { guest: { is: { firstName: { contains: query } } } },
            { guest: { is: { lastName: { contains: query } } } },
            { hotelSlug: { contains: query } },
          ],
        }
      : {}),
  };
}

export class BusinessBookingRequestUnavailableError extends Error {
  constructor() {
    super('The approved company request is no longer available for booking.');
    this.name = 'BusinessBookingRequestUnavailableError';
  }
}

export interface BookingRepository {
  cancel(bookingId: string, refundPayment: boolean): Promise<void>;
  findByConfirmationCode(
    code: string,
    accessTokenHash: string,
  ): Promise<HotelBookingRecord | undefined>;
  findByConfirmationCodeAndGuestEmail(
    code: string,
    email: string,
  ): Promise<HotelBookingRecord | undefined>;
  findByIdempotencyKey(key: string): Promise<HotelBookingRecord | undefined>;
  findById(id: string): Promise<HotelBookingRecord | undefined>;
  findAll(options?: PartnerBookingQuery): Promise<HotelBookingRecord[]>;
  getPartnerSummary(options?: PartnerBookingQuery): Promise<{
    capturedInrValue: number;
    confirmedCount: number;
    totalCount: number;
  }>;
  save(
    booking: HotelBookingRecord,
    idempotencyKey: string,
    accessTokenHash: string,
    paymentContext: ConfirmedPaymentContext,
    businessContext?: BusinessBookingContext,
  ): Promise<void>;
}

export class InMemoryBookingRepository implements BookingRepository {
  private readonly bookingsByIdempotencyKey = new Map<string, HotelBookingRecord>();
  private readonly tokenHashesByConfirmationCode = new Map<string, string>();

  async cancel(bookingId: string, refundPayment: boolean): Promise<void> {
    for (const [key, booking] of this.bookingsByIdempotencyKey.entries()) {
      if (booking.id === bookingId) {
        this.bookingsByIdempotencyKey.set(key, {
          ...booking,
          paymentStatus: refundPayment ? 'refunded' : booking.paymentStatus,
          status: 'cancelled',
        });
        return;
      }
    }
  }

  async findByConfirmationCode(
    code: string,
    accessTokenHash: string,
  ): Promise<HotelBookingRecord | undefined> {
    if (this.tokenHashesByConfirmationCode.get(code) !== accessTokenHash) {
      return undefined;
    }

    return [...this.bookingsByIdempotencyKey.values()].find(
      (booking) => booking.confirmationCode === code,
    );
  }

  async findByConfirmationCodeAndGuestEmail(
    code: string,
    email: string,
  ): Promise<HotelBookingRecord | undefined> {
    return [...this.bookingsByIdempotencyKey.values()].find(
      (booking) =>
        booking.confirmationCode === code &&
        normalizeEmail(booking.guest.email) === normalizeEmail(email),
    );
  }

  async findByIdempotencyKey(key: string): Promise<HotelBookingRecord | undefined> {
    return this.bookingsByIdempotencyKey.get(key);
  }

  async findById(id: string): Promise<HotelBookingRecord | undefined> {
    return [...this.bookingsByIdempotencyKey.values()].find((booking) => booking.id === id);
  }

  async findAll(options: PartnerBookingQuery = {}): Promise<HotelBookingRecord[]> {
    const skip = options.skip ?? 0;
    const take = options.take ?? Number.POSITIVE_INFINITY;
    return [...this.bookingsByIdempotencyKey.values()]
      .filter((booking) => matchesPartnerQuery(booking, options))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(skip, skip + take);
  }

  async getPartnerSummary(options: PartnerBookingQuery = {}) {
    const bookings = [...this.bookingsByIdempotencyKey.values()].filter((booking) =>
      matchesPartnerQuery(booking, options),
    );
    return {
      capturedInrValue: bookings
        .filter((booking) => booking.currency === 'INR' && booking.paymentStatus === 'captured')
        .reduce((total, booking) => total + booking.paymentAmount, 0),
      confirmedCount: bookings.filter((booking) => booking.status === 'confirmed').length,
      totalCount: bookings.length,
    };
  }

  async save(
    booking: HotelBookingRecord,
    idempotencyKey: string,
    accessTokenHash: string,
    paymentContext: ConfirmedPaymentContext,
    businessContext?: BusinessBookingContext,
  ): Promise<void> {
    void paymentContext;
    void businessContext;
    this.bookingsByIdempotencyKey.set(idempotencyKey, booking);
    this.tokenHashesByConfirmationCode.set(booking.confirmationCode, accessTokenHash);
  }
}

function parseRoomAssignments(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function mapBooking(booking: {
  assignedRoomNumbersJson: string;
  availabilityLockId: string;
  quote: { checkInDate: string; checkOutDate: string };
  confirmationCode: string;
  createdAt: Date;
  currency: string;
  guest: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    specialRequests: string;
  } | null;
  hotelSlug: string;
  id: string;
  operationalStatus: string;
  partnerNote: string;
  payment: { amount: number; status: string } | null;
  quoteId: string;
  status: string;
  totalAmount: number;
}): HotelBookingRecord | undefined {
  if (!booking.guest || !booking.payment) {
    return undefined;
  }

  return {
    assignedRoomNumbers: parseRoomAssignments(booking.assignedRoomNumbersJson),
    availabilityLockId: booking.availabilityLockId,
    checkInDate: booking.quote.checkInDate,
    checkOutDate: booking.quote.checkOutDate,
    confirmationCode: booking.confirmationCode,
    createdAt: booking.createdAt.toISOString(),
    currency: booking.currency as HotelBookingRecord['currency'],
    guest: booking.guest,
    hotelSlug: booking.hotelSlug,
    id: booking.id,
    operationalStatus: booking.operationalStatus as HotelBookingRecord['operationalStatus'],
    partnerNote: booking.partnerNote,
    paymentAmount: booking.payment.amount,
    paymentStatus: booking.payment.status as HotelBookingRecord['paymentStatus'],
    quoteId: booking.quoteId,
    status: booking.status as HotelBookingRecord['status'],
    totalAmount: booking.totalAmount,
  };
}

export class PrismaBookingRepository implements BookingRepository {
  async cancel(bookingId: string, refundPayment: boolean): Promise<void> {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return;
    }

    await prisma.$transaction([
      prisma.booking.update({ data: { status: 'cancelled' }, where: { id: bookingId } }),
      prisma.availabilityLock.update({
        data: { status: 'released' },
        where: { id: booking.availabilityLockId },
      }),
      ...(refundPayment
        ? [
            prisma.paymentTransaction.update({
              data: { status: 'refunded' },
              where: { bookingId },
            }),
          ]
        : []),
    ]);
  }

  async findByConfirmationCode(
    code: string,
    accessTokenHash: string,
  ): Promise<HotelBookingRecord | undefined> {
    const booking = await prisma.booking.findUnique({
      include: { guest: true, payment: true, quote: true },
      where: { confirmationCode: code, accessTokenHash },
    });
    return booking ? mapBooking(booking) : undefined;
  }

  async findByConfirmationCodeAndGuestEmail(
    code: string,
    email: string,
  ): Promise<HotelBookingRecord | undefined> {
    const booking = await prisma.booking.findUnique({
      include: { guest: true, payment: true, quote: true },
      where: { confirmationCode: code },
    });

    if (!booking?.guest || normalizeEmail(booking.guest.email) !== normalizeEmail(email)) {
      return undefined;
    }

    return mapBooking(booking);
  }

  async findByIdempotencyKey(key: string): Promise<HotelBookingRecord | undefined> {
    const booking = await prisma.booking.findUnique({
      include: { guest: true, payment: true, quote: true },
      where: { idempotencyKey: key },
    });
    return booking ? mapBooking(booking) : undefined;
  }

  async findById(id: string): Promise<HotelBookingRecord | undefined> {
    const booking = await prisma.booking.findUnique({
      include: { guest: true, payment: true, quote: true },
      where: { id },
    });
    return booking ? mapBooking(booking) : undefined;
  }

  async findAll(options: PartnerBookingQuery = {}): Promise<HotelBookingRecord[]> {
    const bookings = await prisma.booking.findMany({
      include: { guest: true, payment: true, quote: true },
      orderBy: { createdAt: 'desc' },
      skip: options.skip,
      take: options.take,
      where: createPartnerBookingWhere(options),
    });
    return bookings
      .map(mapBooking)
      .filter((booking): booking is HotelBookingRecord => booking !== undefined);
  }

  async getPartnerSummary(options: PartnerBookingQuery = {}) {
    const bookingWhere = createPartnerBookingWhere(options);
    const [totalCount, confirmedCount, capturedValue] = await Promise.all([
      prisma.booking.count({ where: bookingWhere }),
      prisma.booking.count({
        where: { ...bookingWhere, status: 'confirmed' },
      }),
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: {
          booking: bookingWhere,
          currency: 'INR',
          status: 'captured',
        },
      }),
    ]);
    return {
      capturedInrValue: capturedValue._sum.amount ?? 0,
      confirmedCount,
      totalCount,
    };
  }

  async save(
    booking: HotelBookingRecord,
    idempotencyKey: string,
    accessTokenHash: string,
    paymentContext: ConfirmedPaymentContext,
    businessContext?: BusinessBookingContext,
  ): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      let organizationId: string | undefined;
      if (businessContext) {
        const travelRequest = await transaction.businessTravelRequest.findFirst({
          select: { organizationId: true },
          where: {
            id: businessContext.requestId,
            requesterId: businessContext.requesterId,
            status: 'APPROVED',
          },
        });
        organizationId = travelRequest?.organizationId;
        const completed = await transaction.businessTravelRequest.updateMany({
          data: {
            bookedAt: new Date(),
            bookingTotalAmount: booking.totalAmount,
            status: 'BOOKED',
          },
          where: {
            id: businessContext.requestId,
            requesterId: businessContext.requesterId,
            status: 'APPROVED',
          },
        });
        if (completed.count !== 1) {
          throw new BusinessBookingRequestUnavailableError();
        }
      }

      const property = await transaction.partnerProperty.findUnique({
        select: {
          partner: { select: { commissionBasisPoints: true, id: true } },
        },
        where: { hotelSlug: booking.hotelSlug },
      });
      const taxComponents = await transaction.priceComponent.aggregate({
        _sum: { amount: true },
        where: { quoteId: booking.quoteId, type: 'tax-and-fee' },
      });
      const taxAmount = Math.min(booking.paymentAmount, taxComponents._sum.amount ?? 0);
      const accounting = createCaptureAccounting({
        amount: booking.paymentAmount,
        commissionBasisPoints: property?.partner.commissionBasisPoints ?? 1000,
        partnerId: property?.partner.id,
        taxAmount,
      });

      const createdBooking = await transaction.booking.create({
        data: {
          accessTokenHash,
          availabilityLockId: booking.availabilityLockId,
          businessTravelRequestId: businessContext?.requestId,
          confirmationCode: booking.confirmationCode,
          createdAt: new Date(booking.createdAt),
          currency: booking.currency,
          guest: { create: booking.guest },
          hotelSlug: booking.hotelSlug,
          id: booking.id,
          idempotencyKey,
          payment: {
            create: {
              amount: booking.paymentAmount,
              checkoutIntentId: paymentContext.checkoutIntentId,
              currency: booking.currency,
              environment: paymentContext.environment,
              provider: paymentContext.provider,
              providerAmount:
                paymentContext.reconciliationStatus === 'MATCHED'
                  ? booking.paymentAmount
                  : undefined,
              providerCurrency:
                paymentContext.reconciliationStatus === 'MATCHED' ? booking.currency : undefined,
              providerRef: paymentContext.providerRef,
              reconciliationStatus: paymentContext.reconciliationStatus,
              status: booking.paymentStatus,
            },
          },
          quoteId: booking.quoteId,
          status: booking.status,
          totalAmount: booking.totalAmount,
        },
        include: { payment: { select: { id: true } } },
      });

      const paymentId = createdBooking.payment?.id;
      if (!paymentId) throw new Error('Captured booking payment was not created.');
      await transaction.paymentAllocation.createMany({
        data: accounting.allocations.map((allocation) => ({
          ...allocation,
          currency: booking.currency,
          partnerId: property?.partner.id,
          paymentId,
        })),
      });
      await transaction.financialJournal.create({
        data: {
          currency: booking.currency,
          description: `Payment captured for booking ${booking.confirmationCode}`,
          paymentId,
          postings: {
            create: accounting.postings.map((posting) => ({
              ...posting,
            })),
          },
          reference: `CAPTURE-${paymentContext.providerRef}`,
          sourceId: paymentId,
          sourceType: 'PAYMENT_CAPTURE',
          status: 'POSTED',
          totalCredit: booking.paymentAmount,
          totalDebit: booking.paymentAmount,
        },
      });

      await transaction.integrationOutboxEvent.create({
        data: {
          aggregateId: booking.id,
          aggregateType: 'HOTEL_BOOKING',
          bookingId: booking.id,
          dedupeKey: `hotel-booking-confirmed:${booking.id}`,
          eventType: 'HOTEL_BOOKING_CONFIRMED',
          payloadJson: JSON.stringify({
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            confirmationCode: booking.confirmationCode,
            currency: booking.currency,
            guestEmail: booking.guest.email,
            guestPhone: booking.guest.phone,
            hotelSlug: booking.hotelSlug,
            totalAmount: booking.totalAmount,
          }),
        },
      });

      if (businessContext && organizationId) {
        await transaction.businessAuditLog.create({
          data: createBusinessAuditData({
            action: BUSINESS_AUDIT_ACTIONS.TRAVEL_BOOKED,
            actorUserId: businessContext.requesterId,
            entityId: businessContext.requestId,
            entityType: 'TRAVEL_REQUEST',
            metadata: {
              confirmationCode: booking.confirmationCode,
              productType: 'HOTEL',
              totalAmount: booking.totalAmount,
            },
            organizationId,
            summary: 'Hotel company travel booked.',
          }),
        });
      }
    });
  }
}

export const bookingRepository = new PrismaBookingRepository();
