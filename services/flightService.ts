import {
  FixtureFlightSupplierAdapter,
  type FlightSupplierAdapter,
} from '@/repositories/flightOfferRepository';
import { AmadeusFlightSupplierAdapter } from '@/repositories/amadeusFlightSupplierAdapter';
import type { FlightOffer, FlightSearchCriteria } from '@/types/flight';
import { normalizeFlightOffer, validateFlightSearchCriteria } from '@/lib/flight/searchRules';
import { readAmadeusFlightConfiguration } from '@/lib/flight/amadeusRules';

export function createFlightSupplierAdapter(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): FlightSupplierAdapter {
  const configuration = readAmadeusFlightConfiguration(environment);
  return configuration
    ? new AmadeusFlightSupplierAdapter(configuration)
    : new FixtureFlightSupplierAdapter();
}

export class FlightService {
  constructor(
    private readonly supplier: FlightSupplierAdapter = new FixtureFlightSupplierAdapter(),
  ) {}

  async search(criteria: FlightSearchCriteria): Promise<FlightOffer[]> {
    validateFlightSearchCriteria(criteria, { today: new Date().toISOString().slice(0, 10) });
    const offers = await this.supplier.search(criteria);
    return offers
      .map((offer) => normalizeFlightOffer(offer, criteria))
      .filter((offer): offer is FlightOffer => offer !== undefined)
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

export const flightService = new FlightService(createFlightSupplierAdapter());
