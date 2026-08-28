import { mockBusOffers } from '@/constants/busData';
import { settleAvailableSources } from '@/lib/inventory/settleAvailableSources';
import { prisma } from '@/lib/prisma';
import type { BusOffer, BusSearchCriteria } from '@/types/bus';

export interface BusSupplierAdapter {
  search(criteria: BusSearchCriteria): Promise<BusOffer[]>;
}

export class FixtureBusSupplierAdapter implements BusSupplierAdapter {
  async search(criteria: BusSearchCriteria): Promise<BusOffer[]> {
    return mockBusOffers.filter(
      (offer) =>
        offer.origin.toLowerCase() === criteria.origin.toLowerCase() &&
        offer.destination.toLowerCase() === criteria.destination.toLowerCase(),
    );
  }
}

function readAmenities(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 30)
      : [];
  } catch {
    return [];
  }
}

function serviceInstant(serviceDate: string, time: string, nextDay = false): string {
  const date = new Date(`${serviceDate}T00:00:00.000Z`);
  if (nextDay) date.setUTCDate(date.getUTCDate() + 1);
  return `${date.toISOString().slice(0, 10)}T${time}:00+05:30`;
}

export class DirectBusSupplierAdapter implements BusSupplierAdapter {
  async search(criteria: BusSearchCriteria): Promise<BusOffer[]> {
    const trips = await prisma.partnerBusTrip.findMany({
      include: {
        reservations: { select: { passengerCount: true }, where: { status: 'CONFIRMED' } },
        route: { include: { partner: { select: { name: true, status: true } } } },
      },
      where: {
        serviceDate: criteria.travelDate,
        status: 'ACTIVE',
        route: {
          status: 'ACTIVE',
        },
      },
    });
    return trips
      .filter(
        (trip) =>
          trip.route.partner.status === 'ACTIVE' &&
          trip.route.origin.localeCompare(criteria.origin, undefined, { sensitivity: 'base' }) ===
            0 &&
          trip.route.destination.localeCompare(criteria.destination, undefined, {
            sensitivity: 'base',
          }) === 0,
      )
      .map((trip) => {
        const reservedSeats = trip.reservations.reduce(
          (total, reservation) => total + reservation.passengerCount,
          0,
        );
        const overnight = trip.arrivalTime <= trip.departureTime;
        return {
          amenities: readAmenities(trip.amenitiesJson),
          arrivalAt: serviceInstant(trip.serviceDate, trip.arrivalTime, overnight),
          boardingPoint: trip.route.boardingPoint,
          busType: trip.busType,
          cancellationPolicy: trip.cancellationPolicy,
          currency: 'INR' as const,
          departureAt: serviceInstant(trip.serviceDate, trip.departureTime),
          destination: trip.route.destination,
          droppingPoint: trip.route.droppingPoint,
          id: `direct-bus-trip-${trip.id}`,
          operatorName: trip.route.partner.name,
          origin: trip.route.origin,
          pricePerSeat: trip.pricePerSeat,
          refundable: trip.refundable,
          rating: 0,
          seatsRemaining: Math.max(0, trip.seatCapacity - reservedSeats),
          source: 'Mandyal direct operator inventory',
          totalPrice: 0,
        };
      });
  }
}

export class CompositeBusSupplierAdapter implements BusSupplierAdapter {
  private readonly suppliers: BusSupplierAdapter[];

  constructor(
    suppliers: BusSupplierAdapter[] = [
      new DirectBusSupplierAdapter(),
      new FixtureBusSupplierAdapter(),
    ],
  ) {
    this.suppliers = suppliers;
  }

  async search(criteria: BusSearchCriteria): Promise<BusOffer[]> {
    return settleAvailableSources(
      this.suppliers.map((supplier) => () => supplier.search(criteria)),
      'Bus inventory sources are temporarily unavailable.',
    );
  }
}
