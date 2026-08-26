import { prisma } from '@/lib/prisma';
import {
  BUS_SEAT_HOLD_DURATION_MS,
  busSeatSetsMatch,
  directBusTripId,
  seatsFitBusCapacity,
} from '@/lib/bus/bookingRules';

const CONFIRMED_RESERVATION_STATUS = 'CONFIRMED';

export class BusSeatHoldError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'BusSeatHoldError';
  }
}

function readStoredSeats(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((seat): seat is string => typeof seat === 'string')
      : [];
  } catch {
    return [];
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002',
  );
}

function normalizeSeats(seats: string[]): string[] {
  return seats.map((seat) => seat.trim().toUpperCase());
}

export interface BusSeatHoldSnapshot {
  expiresAt: string;
  holdId: string;
  seats: string[];
}

export const busSeatHoldService = {
  async create(input: {
    offerId: string;
    seats: string[];
    serviceDate: string;
    userId: string;
  }): Promise<BusSeatHoldSnapshot> {
    const tripId = directBusTripId(input.offerId);
    if (!tripId) {
      throw new BusSeatHoldError(
        'DIRECT_BUS_REQUIRED',
        'Seat holds are available only for direct operator bus inventory.',
        400,
      );
    }
    const seats = normalizeSeats(input.seats);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + BUS_SEAT_HOLD_DURATION_MS);

    try {
      return await prisma.$transaction(
        async (transaction) => {
          const trip = await transaction.partnerBusTrip.findUnique({
            include: {
              reservations: {
                select: { seatNumbersJson: true },
                where: { status: CONFIRMED_RESERVATION_STATUS },
              },
              route: { include: { partner: { select: { status: true } } } },
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
            throw new BusSeatHoldError(
              'BUS_TRIP_UNAVAILABLE',
              'This direct operator trip is no longer available.',
              409,
            );
          }
          if (
            seats.length < 1 ||
            seats.length > 6 ||
            new Set(seats).size !== seats.length ||
            !seatsFitBusCapacity(seats, trip.seatCapacity)
          ) {
            throw new BusSeatHoldError(
              'INVALID_BUS_SEATS',
              'Choose between one and six valid, unique seats within this bus capacity.',
              400,
            );
          }

          await transaction.partnerBusSeatHold.deleteMany({
            where: { expiresAt: { lte: now }, tripId },
          });
          const reservedSeats = new Set(
            trip.reservations.flatMap((reservation) =>
              readStoredSeats(reservation.seatNumbersJson),
            ),
          );
          if (seats.some((seat) => reservedSeats.has(seat))) {
            throw new BusSeatHoldError(
              'BUS_SEAT_UNAVAILABLE',
              'One or more selected seats were just reserved. Please choose different seats.',
              409,
            );
          }

          await transaction.partnerBusSeatHold.deleteMany({
            where: { tripId, userId: input.userId },
          });
          const conflictingSeat = await transaction.partnerBusSeatHoldSeat.findFirst({
            select: { seatNumber: true },
            where: { seatNumber: { in: seats }, tripId },
          });
          if (conflictingSeat) {
            throw new BusSeatHoldError(
              'BUS_SEAT_HELD',
              `${conflictingSeat.seatNumber} is being held by another traveler. Please choose a different seat.`,
              409,
            );
          }
          const hold = await transaction.partnerBusSeatHold.create({
            data: {
              expiresAt,
              seats: { create: seats.map((seatNumber) => ({ seatNumber, tripId })) },
              tripId,
              userId: input.userId,
            },
            include: { seats: { orderBy: { seatNumber: 'asc' } } },
          });
          return {
            expiresAt: hold.expiresAt.toISOString(),
            holdId: hold.id,
            seats: hold.seats.map((seat) => seat.seatNumber),
          };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (error instanceof BusSeatHoldError) throw error;
      if (isUniqueConstraintError(error)) {
        throw new BusSeatHoldError(
          'BUS_SEAT_HELD',
          'One or more selected seats are being held by another traveler. Please choose different seats.',
          409,
        );
      }
      throw error;
    }
  },

  async release(input: { holdId: string; userId: string }): Promise<boolean> {
    const deleted = await prisma.partnerBusSeatHold.deleteMany({
      where: { id: input.holdId, userId: input.userId },
    });
    return deleted.count > 0;
  },

  async unavailableSeats(offerId: string, at = new Date(), userId?: string): Promise<string[]> {
    const tripId = directBusTripId(offerId);
    if (!tripId) return [];
    const trip = await prisma.partnerBusTrip.findUnique({
      include: {
        reservations: {
          select: { seatNumbersJson: true },
          where: { status: CONFIRMED_RESERVATION_STATUS },
        },
        seatHolds: {
          include: { seats: { select: { seatNumber: true } } },
          where: { expiresAt: { gt: at }, ...(userId ? { userId: { not: userId } } : {}) },
        },
      },
      where: { id: tripId },
    });
    if (!trip) return [];
    return [
      ...new Set([
        ...trip.reservations.flatMap((reservation) => readStoredSeats(reservation.seatNumbersJson)),
        ...trip.seatHolds.flatMap((hold) => hold.seats.map((seat) => seat.seatNumber)),
      ]),
    ].sort();
  },

  async validateOwnedHold(input: {
    holdId: string;
    offerId: string;
    seats: string[];
    serviceDate: string;
    userId: string;
  }): Promise<void> {
    const tripId = directBusTripId(input.offerId);
    if (!tripId) return;
    const hold = await prisma.partnerBusSeatHold.findFirst({
      include: { seats: { select: { seatNumber: true } }, trip: { select: { serviceDate: true } } },
      where: { id: input.holdId, tripId, userId: input.userId },
    });
    if (
      !hold ||
      hold.expiresAt <= new Date() ||
      hold.trip.serviceDate !== input.serviceDate ||
      !busSeatSetsMatch(
        hold.seats.map((seat) => seat.seatNumber),
        input.seats,
      )
    ) {
      throw new BusSeatHoldError(
        'BUS_SEAT_HOLD_INVALID',
        'Your seat hold has expired or no longer matches this booking. Please select seats again.',
        409,
      );
    }
  },
};
