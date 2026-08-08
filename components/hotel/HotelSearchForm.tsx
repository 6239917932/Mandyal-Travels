import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { HotelSearchCriteria } from '@/types/hotel';

interface HotelSearchFormProps {
  criteria: HotelSearchCriteria;
}

export function HotelSearchForm({ criteria }: HotelSearchFormProps) {
  return (
    <form action="/hotels" className="hotel-search-form">
      <Input
        defaultValue={criteria.destination}
        label="Destination"
        name="destination"
        placeholder="City or hotel name"
      />

      <Input
        defaultValue={criteria.checkInDate}
        label="Check-in"
        name="checkInDate"
        required
        type="date"
      />

      <Input
        defaultValue={criteria.checkOutDate}
        label="Check-out"
        name="checkOutDate"
        required
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

      <Input
        defaultValue={criteria.children}
        label="Children"
        min="0"
        name="children"
        required
        type="number"
      />

      <Input
        defaultValue={criteria.rooms}
        label="Rooms"
        min="1"
        name="rooms"
        required
        type="number"
      />

      <Button className="hotel-search-form__button" type="submit">
        Search hotels
      </Button>
    </form>
  );
}
