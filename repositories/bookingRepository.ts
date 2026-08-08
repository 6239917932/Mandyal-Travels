import type { HotelBookingRecord } from '@/types/commerce';
import { prisma } from '@/lib/prisma';

export interface BookingRepository {
  cancel(bookingId: string, refundPayment: boolean): Promise<void>;
  findByConfirmationCode(
    code: string,
    accessTokenHash: string,
  ): Promise<HotelBookingRecord | undefined>;
  findByIdempotencyKey(key: string): Promise<HotelBookingRecord | undefined>;
  findById(id: string): Promise<HotelBookingRecord | undefined>;
  findAll(): Promise<HotelBookingRecord[]>;
  save(booking: HotelBookingRecord, idempotencyKey: string, accessTokenHash: string): Promise<void>;
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

  async findByIdempotencyKey(key: string): Promise<HotelBookingRecord | undefined> {
    return this.bookingsByIdempotencyKey.get(key);
  }

  async findById(id: string): Promise<HotelBookingRecord | undefined> {
    return [...this.bookingsByIdempotencyKey.values()].find((booking) => booking.id === id);
  }

  async findAll(): Promise<HotelBookingRecord[]> {
    return [...this.bookingsByIdempotencyKey.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async save(
    booking: HotelBookingRecord,
    idempotencyKey: string,
    accessTokenHash: string,
  ): Promise<void> {
    this.bookingsByIdempotencyKey.set(idempotencyKey, booking);
    this.tokenHashesByConfirmationCode.set(booking.confirmationCode, accessTokenHash);
  }
}

function mapBooking(booking: {
  availabilityLockId: string;
  confirmationCode: string;
  createdAt: Date;
  currency: string;
  guest: { email: string; firstName: string; lastName: string; phone: string } | null;
  hotelSlug: string;
  id: string;
  payment: { status: string } | null;
  quoteId: string;
  status: string;
  totalAmount: number;
}): HotelBookingRecord | undefined {
  if (!booking.guest || !booking.payment) {
    return undefined;
  }

  return {
    availabilityLockId: booking.availabilityLockId,
    confirmationCode: booking.confirmationCode,
    createdAt: booking.createdAt.toISOString(),
    currency: booking.currency as HotelBookingRecord['currency'],
    guest: booking.guest,
    hotelSlug: booking.hotelSlug,
    id: booking.id,
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
      include: { guest: true, payment: true },
      where: { confirmationCode: code, accessTokenHash },
    });
    return booking ? mapBooking(booking) : undefined;
  }

  async findByIdempotencyKey(key: string): Promise<HotelBookingRecord | undefined> {
    const booking = await prisma.booking.findUnique({
      include: { guest: true, payment: true },
      where: { idempotencyKey: key },
    });
    return booking ? mapBooking(booking) : undefined;
  }

  async findById(id: string): Promise<HotelBookingRecord | undefined> {
    const booking = await prisma.booking.findUnique({
      include: { guest: true, payment: true },
      where: { id },
    });
    return booking ? mapBooking(booking) : undefined;
  }

  async findAll(): Promise<HotelBookingRecord[]> {
    const bookings = await prisma.booking.findMany({
      include: { guest: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
    return bookings
      .map(mapBooking)
      .filter((booking): booking is HotelBookingRecord => booking !== undefined);
  }

  async save(
    booking: HotelBookingRecord,
    idempotencyKey: string,
    accessTokenHash: string,
  ): Promise<void> {
    await prisma.booking.create({
      data: {
        accessTokenHash,
        availabilityLockId: booking.availabilityLockId,
        confirmationCode: booking.confirmationCode,
        createdAt: new Date(booking.createdAt),
        currency: booking.currency,
        guest: { create: booking.guest },
        hotelSlug: booking.hotelSlug,
        id: booking.id,
        idempotencyKey,
        payment: {
          create: {
            amount: booking.totalAmount,
            currency: booking.currency,
            provider: 'mock',
            providerRef: `mock-${booking.id}`,
            status: booking.paymentStatus,
          },
        },
        quoteId: booking.quoteId,
        status: booking.status,
        totalAmount: booking.totalAmount,
      },
    });
  }
}

export const bookingRepository = new PrismaBookingRepository();
