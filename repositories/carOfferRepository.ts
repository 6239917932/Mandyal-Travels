import { mockCarOffers } from '@/constants/carData';
import { settleAvailableSources } from '@/lib/inventory/settleAvailableSources';
import { isFixtureInventoryEnabled } from '@/lib/inventory/fixtureInventoryPolicy';
import { partnerOperationsService } from '@/services/partnerOperationsService';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';
import type { CarOffer, CarSearchCriteria } from '@/types/car';

export interface CarSupplierAdapter {
  search(criteria: CarSearchCriteria): Promise<CarOffer[]>;
}

export class FixtureCarSupplierAdapter implements CarSupplierAdapter {
  constructor(private readonly fixtureInventoryEnabled = isFixtureInventoryEnabled()) {}

  async search(criteria: CarSearchCriteria): Promise<CarOffer[]> {
    if (!this.fixtureInventoryEnabled) return [];
    return mockCarOffers.filter(
      (offer) =>
        offer.pickupLocation.toLowerCase() === criteria.pickupLocation.toLowerCase() &&
        offer.dropoffLocation.toLowerCase() === criteria.dropoffLocation.toLowerCase() &&
        offer.rentalMode === criteria.rentalMode,
    );
  }
}

export class DirectCarSupplierAdapter implements CarSupplierAdapter {
  async search(criteria: CarSearchCriteria): Promise<CarOffer[]> {
    if (!(await isPlatformFeatureEnabled('CAR_MARKETPLACE'))) return [];
    if (criteria.rentalMode !== 'self-drive' || criteria.pickupTime !== criteria.dropoffTime)
      return [];
    return partnerOperationsService.searchDirectVehicles(criteria);
  }
}

export class CompositeCarSupplierAdapter implements CarSupplierAdapter {
  private readonly suppliers: CarSupplierAdapter[];

  constructor(
    suppliers: CarSupplierAdapter[] = [
      new DirectCarSupplierAdapter(),
      new FixtureCarSupplierAdapter(),
    ],
  ) {
    this.suppliers = suppliers;
  }

  async search(criteria: CarSearchCriteria): Promise<CarOffer[]> {
    return settleAvailableSources(
      this.suppliers.map((supplier) => () => supplier.search(criteria)),
      'Car inventory sources are temporarily unavailable.',
    );
  }
}
