import { InMemoryHotelRepository } from '@/repositories/hotelRepository';
import type {
  Hotel,
  HotelRatePlan,
  HotelSearchCriteria,
  HotelSearchResult,
  Money,
} from '@/types/hotel';
import type { HotelRepository } from '@/repositories/hotelRepository';

function calculateNights(checkInDate: string, checkOutDate: string): number {
  const checkIn = new Date(`${checkInDate}T00:00:00Z`);
  const checkOut = new Date(`${checkOutDate}T00:00:00Z`);

  const durationInMilliseconds = checkOut.getTime() - checkIn.getTime();
  return Math.round(durationInMilliseconds / (1000 * 60 * 60 * 24));
}

function matchesDestination(hotel: Hotel, destination: string): boolean {
  const normalizedDestination = destination.trim().toLowerCase();

  if (!normalizedDestination) {
    return true;
  }

  const searchableText = [
    hotel.name,
    hotel.location.address.city,
    hotel.location.address.state,
    hotel.location.address.country,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedDestination);
}

function findLowestRatePlan(ratePlans: HotelRatePlan[]): HotelRatePlan | undefined {
  return ratePlans.reduce<HotelRatePlan | undefined>((lowestRatePlan, currentRatePlan) => {
    if (!lowestRatePlan || currentRatePlan.nightlyRate.amount < lowestRatePlan.nightlyRate.amount) {
      return currentRatePlan;
    }

    return lowestRatePlan;
  }, undefined);
}

function calculateTotalStayPrice(ratePlan: HotelRatePlan, nights: number, rooms: number): Money {
  const nightlyTotal = ratePlan.nightlyRate.amount + ratePlan.taxesAndFees.amount;

  return {
    amount: nightlyTotal * nights * rooms,
    currency: ratePlan.nightlyRate.currency,
  };
}

export class HotelService {
  constructor(private readonly hotelRepository: HotelRepository = new InMemoryHotelRepository()) {}

  async getHotelBySlug(slug: string): Promise<Hotel | undefined> {
    return this.hotelRepository.findBySlug(slug);
  }

  async searchHotels(criteria: HotelSearchCriteria): Promise<HotelSearchResult[]> {
    const nights = calculateNights(criteria.checkInDate, criteria.checkOutDate);

    if (!Number.isFinite(nights) || nights < 1) {
      throw new Error('Check-out date must be later than check-in date.');
    }

    const hotels = await this.hotelRepository.findAll();

    return hotels
      .filter((hotel) => matchesDestination(hotel, criteria.destination))
      .map((hotel) => {
        const availableRatePlans = hotel.rooms
          .filter(
            (room) =>
              room.isAvailable &&
              room.inventoryCount >= criteria.rooms &&
              room.occupancy.maximumAdults >= criteria.adults,
          )
          .flatMap((room) => room.ratePlans);

        const lowestRatePlan = findLowestRatePlan(availableRatePlans);

        if (!lowestRatePlan) {
          return undefined;
        }

        return {
          hotel,
          isAvailable: true,
          minimumNightlyRate: lowestRatePlan.nightlyRate,
          nights,
          totalStayPrice: calculateTotalStayPrice(lowestRatePlan, nights, criteria.rooms),
        };
      })
      .filter((result): result is HotelSearchResult => result !== undefined)
      .sort((firstResult, secondResult) => {
        return firstResult.minimumNightlyRate.amount - secondResult.minimumNightlyRate.amount;
      });
  }
}

export const hotelService = new HotelService();
