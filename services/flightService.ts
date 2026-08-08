import {
  FixtureFlightSupplierAdapter,
  type FlightSupplierAdapter,
} from '@/repositories/flightOfferRepository';
import type { FlightOffer, FlightSearchCriteria } from '@/types/flight';

export class FlightService {
  constructor(
    private readonly supplier: FlightSupplierAdapter = new FixtureFlightSupplierAdapter(),
  ) {}

  async search(criteria: FlightSearchCriteria): Promise<FlightOffer[]> {
    if (criteria.origin === criteria.destination)
      throw new Error('Origin and destination must be different.');
    if (criteria.departureDate < new Date().toISOString().slice(0, 10))
      throw new Error('Departure date cannot be in the past.');
    if (
      criteria.tripType === 'return' &&
      (!criteria.returnDate || criteria.returnDate <= criteria.departureDate)
    )
      throw new Error('Return date must be later than departure date.');
    const offers = await this.supplier.search(criteria);
    return offers
      .filter((offer) => offer.seatsRemaining >= criteria.adults)
      .map((offer) => ({ ...offer, totalPrice: offer.pricePerAdult * criteria.adults }))
      .sort((first, second) => first.totalPrice - second.totalPrice);
  }

  async revalidateOffer(
    offerId: string,
    criteria: FlightSearchCriteria,
  ): Promise<FlightOffer | undefined> {
    const offers = await this.search(criteria);
    return offers.find((offer) => offer.id === offerId);
  }
}

export const flightService = new FlightService();
