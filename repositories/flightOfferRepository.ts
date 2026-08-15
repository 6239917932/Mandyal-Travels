import { mockFlightOffers } from '@/constants/flightData';
import type { FlightOffer, FlightSearchCriteria } from '@/types/flight';

export interface FlightSupplierAdapter {
  search(criteria: FlightSearchCriteria): Promise<FlightOffer[]>;
}

export class FixtureFlightSupplierAdapter implements FlightSupplierAdapter {
  async search(criteria: FlightSearchCriteria): Promise<FlightOffer[]> {
    return mockFlightOffers.filter((offer) => {
      const firstSegment = offer.segments[0];
      return (
        firstSegment.departureAirport === criteria.origin &&
        offer.cabinClass === criteria.cabinClass
      );
    });
  }
}
