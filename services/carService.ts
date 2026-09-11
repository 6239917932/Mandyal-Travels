import {
  CompositeCarSupplierAdapter,
  type CarSupplierAdapter,
} from '@/repositories/carOfferRepository';
import type { CarOffer, CarSearchCriteria } from '@/types/car';
import {
  normalizeCarOffer,
  rentalDurationDays,
  validateCarSearchCriteria,
} from '@/lib/car/searchRules';
import { formatIndiaCalendarDate } from '@/utils/localDate';

export class CarService {
  constructor(private readonly supplier: CarSupplierAdapter = new CompositeCarSupplierAdapter()) {}
  async search(criteria: CarSearchCriteria): Promise<CarOffer[]> {
    validateCarSearchCriteria(criteria, formatIndiaCalendarDate());
    return (await this.supplier.search(criteria))
      .map((offer) => normalizeCarOffer(offer, criteria))
      .filter((offer): offer is CarOffer => offer !== undefined)
      .sort((a, b) => a.totalPrice - b.totalPrice);
  }
  async revalidateOffer(id: string, criteria: CarSearchCriteria) {
    return (await this.search(criteria)).find((offer) => offer.id === id);
  }
}
export const carService = new CarService();
export { rentalDurationDays as rentalDays };
