import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { BusSearchCriteria } from '@/types/bus';
import { formatIndiaCalendarDate } from '@/utils/localDate';

export function BusSearchForm({ criteria }: { criteria: BusSearchCriteria }) {
  const today = formatIndiaCalendarDate();
  return (
    <form action="/buses" className="bus-search-form">
      <Input defaultValue={criteria.origin} label="From" name="origin" required />
      <Input defaultValue={criteria.destination} label="To" name="destination" required />
      <Input
        defaultValue={criteria.travelDate >= today ? criteria.travelDate : today}
        label="Travel date"
        min={today}
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
