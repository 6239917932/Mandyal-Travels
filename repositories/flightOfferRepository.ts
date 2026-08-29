import { mockFlightOffers } from '@/constants/flightData';
import { isFixtureInventoryEnabled } from '@/lib/inventory/fixtureInventoryPolicy';
import type { FlightOffer, FlightSearchCriteria } from '@/types/flight';

export interface FlightSupplierAdapter {
  search(criteria: FlightSearchCriteria): Promise<FlightOffer[]>;
}

export class FixtureFlightSupplierAdapter implements FlightSupplierAdapter {
  constructor(private readonly fixtureInventoryEnabled = isFixtureInventoryEnabled()) {}

  async search(criteria: FlightSearchCriteria): Promise<FlightOffer[]> {
    if (!this.fixtureInventoryEnabled) return [];
    return mockFlightOffers.filter((offer) => {
      const firstSegment = offer.segments[0];
      return (
        firstSegment.departureAirport === criteria.origin &&
        offer.cabinClass === criteria.cabinClass
      );
    });
  }
}
