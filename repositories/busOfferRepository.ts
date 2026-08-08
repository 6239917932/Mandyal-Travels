import { mockBusOffers } from '@/constants/busData';
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
