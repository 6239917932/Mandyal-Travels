import { prisma } from '@/lib/prisma';
import type { BookingAmendmentRecord, PriceComponent } from '@/types/commerce';

export interface CreateBookingAmendmentInput {
  bookingId: string;
  reason: string;
  requestedCheckInDate: string;
  requestedCheckOutDate: string;
}

export interface AmendmentRepository {
  create(input: CreateBookingAmendmentInput): Promise<BookingAmendmentRecord>;
  countPending(hotelSlugs?: string[]): Promise<number>;
  decline(id: string, reviewNote: string): Promise<BookingAmendmentRecord | undefined>;
  findLatestByBookingId(bookingId: string): Promise<BookingAmendmentRecord | undefined>;
  findPending(options?: {
    hotelSlugs?: string[];
    skip?: number;
    take?: number;
  }): Promise<Array<BookingAmendmentRecord & { bookingId: string }>>;
  findPendingById(
    id: string,
    hotelSlugs?: string[],
  ): Promise<(BookingAmendmentRecord & { bookingId: string }) | undefined>;
  approve(
    id: string,
    input: {
      checkInDate: string;
      checkOutDate: string;
      nights: number;
      priceComponents: PriceComponent[];
      reviewNote: string;
      totalAmount: number;
    },
  ): Promise<BookingAmendmentRecord | undefined>;
}

function mapAmendment(amendment: {
  createdAt: Date;
  id: string;
  reason: string;
  requestedCheckInDate: string;
  requestedCheckOutDate: string;
  requestedTotalAmount: number | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  status: string;
}): BookingAmendmentRecord {
  return {
    id: amendment.id,
    reason: amendment.reason,
    requestedCheckInDate: amendment.requestedCheckInDate,
    requestedCheckOutDate: amendment.requestedCheckOutDate,
    ...(amendment.requestedTotalAmount === null
      ? {}
      : { requestedTotalAmount: amendment.requestedTotalAmount }),
    createdAt: amendment.createdAt.toISOString(),
    ...(amendment.reviewedAt ? { reviewedAt: amendment.reviewedAt.toISOString() } : {}),
    ...(amendment.reviewNote ? { reviewNote: amendment.reviewNote } : {}),
    status: amendment.status as BookingAmendmentRecord['status'],
  };
}

export class PrismaAmendmentRepository implements AmendmentRepository {
  async countPending(hotelSlugs?: string[]): Promise<number> {
    return prisma.bookingAmendment.count({
      where: {
        booking: hotelSlugs ? { hotelSlug: { in: hotelSlugs } } : undefined,
        status: 'pending',
      },
    });
  }

  async approve(
    id: string,
    input: {
      checkInDate: string;
      checkOutDate: string;
      nights: number;
      priceComponents: PriceComponent[];
      reviewNote: string;
      totalAmount: number;
    },
  ): Promise<BookingAmendmentRecord | undefined> {
    const amendment = await prisma.bookingAmendment.findUnique({
      include: { booking: { include: { quote: true } } },
      where: { id },
    });
    if (!amendment || amendment.status !== 'pending' || amendment.booking.status !== 'confirmed') {
      return undefined;
    }

    const reviewedAt = new Date();
    const [, updated] = await prisma.$transaction([
      prisma.availabilityLock.update({
        data: { checkInDate: input.checkInDate, checkOutDate: input.checkOutDate },
        where: { id: amendment.booking.availabilityLockId },
      }),
      prisma.bookingAmendment.update({
        data: {
          requestedTotalAmount: input.totalAmount,
          reviewedAt,
          reviewNote: input.reviewNote,
          status: 'approved',
        },
        where: { id },
      }),
      prisma.priceComponent.deleteMany({ where: { quoteId: amendment.booking.quoteId } }),
      prisma.hotelQuote.update({
        data: {
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          components: { create: input.priceComponents },
          nights: input.nights,
          totalAmount: input.totalAmount,
        },
        where: { id: amendment.booking.quoteId },
      }),
      prisma.booking.update({
        data: { totalAmount: input.totalAmount },
        where: { id: amendment.bookingId },
      }),
    ]);
    return mapAmendment(updated);
  }

  async create(input: CreateBookingAmendmentInput): Promise<BookingAmendmentRecord> {
    const amendment = await prisma.bookingAmendment.create({
      data: {
        ...input,
        id: crypto.randomUUID(),
        status: 'pending',
      },
    });
    return mapAmendment(amendment);
  }

  async findLatestByBookingId(bookingId: string): Promise<BookingAmendmentRecord | undefined> {
    const amendment = await prisma.bookingAmendment.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { bookingId },
    });
    return amendment ? mapAmendment(amendment) : undefined;
  }

  async findPending(
    options: { hotelSlugs?: string[]; skip?: number; take?: number } = {},
  ): Promise<Array<BookingAmendmentRecord & { bookingId: string }>> {
    const amendments = await prisma.bookingAmendment.findMany({
      orderBy: { createdAt: 'asc' },
      skip: options.skip,
      take: options.take,
      where: {
        booking: options.hotelSlugs ? { hotelSlug: { in: options.hotelSlugs } } : undefined,
        status: 'pending',
      },
    });
    return amendments.map((amendment) => ({
      ...mapAmendment(amendment),
      bookingId: amendment.bookingId,
    }));
  }

  async findPendingById(
    id: string,
    hotelSlugs?: string[],
  ): Promise<(BookingAmendmentRecord & { bookingId: string }) | undefined> {
    const amendment = await prisma.bookingAmendment.findFirst({
      where: {
        booking: hotelSlugs ? { hotelSlug: { in: hotelSlugs } } : undefined,
        id,
        status: 'pending',
      },
    });
    return amendment ? { ...mapAmendment(amendment), bookingId: amendment.bookingId } : undefined;
  }

  async decline(id: string, reviewNote: string): Promise<BookingAmendmentRecord | undefined> {
    const result = await prisma.bookingAmendment.updateMany({
      data: { reviewedAt: new Date(), reviewNote, status: 'declined' },
      where: { id, status: 'pending' },
    });
    if (result.count !== 1) return undefined;
    const amendment = await prisma.bookingAmendment.findUnique({ where: { id } });
    return amendment ? mapAmendment(amendment) : undefined;
  }
}

export const amendmentRepository = new PrismaAmendmentRepository();
