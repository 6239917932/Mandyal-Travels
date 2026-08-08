import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { FlightSearchCriteria } from '@/types/flight';

export function FlightSearchForm({ criteria }: { criteria: FlightSearchCriteria }) {
  return (
    <form action="/flights" className="flight-search-form">
      <div className="ui-field">
        <label className="ui-field__label" htmlFor="tripType">
          Trip type
        </label>
        <select className="ui-input" defaultValue={criteria.tripType} id="tripType" name="tripType">
          <option value="one-way">One way</option>
          <option value="return">Return</option>
        </select>
      </div>
      <Input defaultValue={criteria.origin} label="From" maxLength={3} name="origin" required />
      <Input
        defaultValue={criteria.destination}
        label="To"
        maxLength={3}
        name="destination"
        required
      />
      <Input
        defaultValue={criteria.departureDate}
        label="Departure"
        name="departureDate"
        required
        type="date"
      />
      <Input
        defaultValue={criteria.returnDate}
        label="Return (optional)"
        name="returnDate"
        type="date"
      />
      <Input
        defaultValue={criteria.adults}
        label="Adults"
        min="1"
        name="adults"
        required
        type="number"
      />
      <div className="ui-field">
        <label className="ui-field__label" htmlFor="cabinClass">
          Cabin
        </label>
        <select
          className="ui-input"
          defaultValue={criteria.cabinClass}
          id="cabinClass"
          name="cabinClass"
        >
          <option value="economy">Economy</option>
          <option value="premium-economy">Premium economy</option>
          <option value="business">Business</option>
        </select>
      </div>
      <Button className="flight-search-form__button" type="submit">
        Search flights
      </Button>
    </form>
  );
}
