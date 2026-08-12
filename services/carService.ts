import {
  CompositeCarSupplierAdapter,
  type CarSupplierAdapter,
} from '@/repositories/carOfferRepository';
import type { CarOffer, CarSearchCriteria } from '@/types/car';

const rentalDays = (pickupDate: string, dropoffDate: string) =>
  Math.max(
    1,
    Math.ceil(
      (new Date(`${dropoffDate}T00:00:00Z`).getTime() -
        new Date(`${pickupDate}T00:00:00Z`).getTime()) /
        86400000,
    ),
  );

export class CarService {
  constructor(private readonly supplier: CarSupplierAdapter = new CompositeCarSupplierAdapter()) {}
  async search(criteria: CarSearchCriteria): Promise<CarOffer[]> {
    if (criteria.dropoffDate <= criteria.pickupDate)
      throw new Error('Drop-off date must be after pickup date.');
    if (criteria.pickupDate < new Date().toISOString().slice(0, 10))
      throw new Error('Pickup date cannot be in the past.');
    const days = rentalDays(criteria.pickupDate, criteria.dropoffDate);
    return (await this.supplier.search(criteria))
      .filter((offer) => offer.carsRemaining > 0)
      .map((offer) => ({ ...offer, totalPrice: offer.pricePerDay * days }))
      .sort((a, b) => a.totalPrice - b.totalPrice);
  }
  async revalidateOffer(id: string, criteria: CarSearchCriteria) {
    return (await this.search(criteria)).find((offer) => offer.id === id);
  }
}
export const carService = new CarService();
export { rentalDays };
