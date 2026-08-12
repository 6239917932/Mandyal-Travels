import { mockCarOffers } from '@/constants/carData';
import { partnerOperationsService } from '@/services/partnerOperationsService';
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

export class DirectCarSupplierAdapter implements CarSupplierAdapter {
  async search(criteria: CarSearchCriteria): Promise<CarOffer[]> {
    return partnerOperationsService.searchDirectVehicles(criteria);
  }
}

export class CompositeCarSupplierAdapter implements CarSupplierAdapter {
  constructor(
    private readonly suppliers: CarSupplierAdapter[] = [
      new DirectCarSupplierAdapter(),
      new FixtureCarSupplierAdapter(),
    ],
  ) {}

  async search(criteria: CarSearchCriteria): Promise<CarOffer[]> {
    const results = await Promise.all(this.suppliers.map((supplier) => supplier.search(criteria)));
    return results.flat();
  }
}
