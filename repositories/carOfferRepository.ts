import { mockCarOffers } from '@/constants/carData';
import type { CarOffer, CarSearchCriteria } from '@/types/car';

export interface CarSupplierAdapter {
  search(criteria: CarSearchCriteria): Promise<CarOffer[]>;
}

export class FixtureCarSupplierAdapter implements CarSupplierAdapter {
  async search(criteria: CarSearchCriteria): Promise<CarOffer[]> {
    return mockCarOffers.filter(
      (offer) =>
        offer.pickupLocation.toLowerCase() === criteria.pickupLocation.toLowerCase() &&
        offer.dropoffLocation.toLowerCase() === criteria.dropoffLocation.toLowerCase(),
    );
  }
}
