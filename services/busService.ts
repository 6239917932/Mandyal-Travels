import {
  CompositeBusSupplierAdapter,
  type BusSupplierAdapter,
} from '@/repositories/busOfferRepository';
import type { BusOffer, BusSearchCriteria } from '@/types/bus';
import { normalizeBusOffer, validateBusSearchCriteria } from '@/lib/bus/searchRules';

export class BusService {
  constructor(private readonly supplier: BusSupplierAdapter = new CompositeBusSupplierAdapter()) {}

  async search(criteria: BusSearchCriteria): Promise<BusOffer[]> {
    validateBusSearchCriteria(criteria, new Date().toISOString().slice(0, 10));
    const offers = await this.supplier.search(criteria);
    return offers
      .map((offer) => normalizeBusOffer(offer, criteria))
      .filter((offer): offer is BusOffer => offer !== undefined)
      .sort((first, second) => first.totalPrice - second.totalPrice);
  }

  async revalidateOffer(
    offerId: string,
    criteria: BusSearchCriteria,
  ): Promise<BusOffer | undefined> {
    return (await this.search(criteria)).find((offer) => offer.id === offerId);
  }
}

export const busService = new BusService();
