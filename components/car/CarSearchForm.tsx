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
      <Input defaultValue={criteria.pickupTime} label="Pickup time" name="pickupTime" required type="time" />
      <Input
        defaultValue={criteria.dropoffDate}
        label="Drop-off date"
        name="dropoffDate"
        required
        type="date"
      />
      <Input defaultValue={criteria.dropoffTime} label="Drop-off time" name="dropoffTime" required type="time" />
      <Input
        defaultValue={criteria.drivers}
        label="Drivers"
        min="1"
        name="drivers"
        required
        type="number"
      />
      <div className="ui-field">
        <label className="ui-field__label" htmlFor="rentalMode">
          Rental type
        </label>
        <select className="ui-input" defaultValue={criteria.rentalMode} id="rentalMode" name="rentalMode">
          <option value="self-drive">Self-drive</option>
          <option value="chauffeur">With chauffeur</option>
        </select>
      </div>
      <Button className="car-search-form__button" type="submit">
        Search cars
      </Button>
    </form>
  );
}
