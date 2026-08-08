import {
  FixtureBusSupplierAdapter,
  type BusSupplierAdapter,
} from '@/repositories/busOfferRepository';
import type { BusOffer, BusSearchCriteria } from '@/types/bus';

export class BusService {
  constructor(private readonly supplier: BusSupplierAdapter = new FixtureBusSupplierAdapter()) {}

  async search(criteria: BusSearchCriteria): Promise<BusOffer[]> {
    if (criteria.origin.toLowerCase() === criteria.destination.toLowerCase())
      throw new Error('Origin and destination must be different.');
    if (criteria.travelDate < new Date().toISOString().slice(0, 10))
      throw new Error('Travel date cannot be in the past.');
    const offers = await this.supplier.search(criteria);
    return offers
      .filter((offer) => offer.seatsRemaining >= criteria.passengers)
      .map((offer) => ({ ...offer, totalPrice: offer.pricePerSeat * criteria.passengers }))
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
