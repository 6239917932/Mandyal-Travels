import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CarSearchCriteria } from '@/types/car';

export function CarSearchForm({ criteria }: { criteria: CarSearchCriteria }) {
  return (
    <form action="/cars" className="car-search-form">
      <Input
        defaultValue={criteria.pickupLocation}
        label="Pickup location"
        name="pickupLocation"
        required
      />
      <Input
        defaultValue={criteria.dropoffLocation}
        label="Drop-off location"
        name="dropoffLocation"
        required
      />
      <Input
        defaultValue={criteria.pickupDate}
        label="Pickup date"
        name="pickupDate"
        required
        type="date"
      />
      <Input
        defaultValue={criteria.dropoffDate}
        label="Drop-off date"
        name="dropoffDate"
        required
        type="date"
      />
      <Input
        defaultValue={criteria.drivers}
        label="Drivers"
        min="1"
        name="drivers"
        required
        type="number"
      />
      <Button className="car-search-form__button" type="submit">
        Search cars
      </Button>
    </form>
  );
}
