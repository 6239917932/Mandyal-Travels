import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { BusSearchCriteria } from '@/types/bus';

export function BusSearchForm({ criteria }: { criteria: BusSearchCriteria }) {
  return (
    <form action="/buses" className="bus-search-form">
      <Input defaultValue={criteria.origin} label="From" name="origin" required />
      <Input defaultValue={criteria.destination} label="To" name="destination" required />
      <Input
        defaultValue={criteria.travelDate}
        label="Travel date"
        name="travelDate"
        required
        type="date"
      />
      <Input
        defaultValue={criteria.passengers}
        label="Passengers"
        max="6"
        min="1"
        name="passengers"
        required
        type="number"
      />
      <Button className="bus-search-form__button" type="submit">
        Search buses
      </Button>
    </form>
  );
}
