'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CarSearchCriteria } from '@/types/car';
import { formatIndiaCalendarDate, offsetLocalCalendarDate } from '@/utils/localDate';

export function CarSearchForm({ criteria }: { criteria: CarSearchCriteria }) {
  const today = formatIndiaCalendarDate();
  const initialPickup = criteria.pickupDate >= today ? criteria.pickupDate : today;
  const [pickupDate, setPickupDate] = useState(initialPickup);
  const [dropoffDate, setDropoffDate] = useState(
    criteria.dropoffDate > initialPickup
      ? criteria.dropoffDate
      : offsetLocalCalendarDate(initialPickup, 1),
  );

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
        label="Pickup date"
        min={today}
        name="pickupDate"
        onChange={(event) => {
          const nextPickup = event.target.value;
          setPickupDate(nextPickup);
          if (dropoffDate <= nextPickup) {
            setDropoffDate(offsetLocalCalendarDate(nextPickup, 1));
          }
        }}
        required
        type="date"
        value={pickupDate}
      />
      <Input
        defaultValue={criteria.pickupTime}
        label="Pickup time"
        name="pickupTime"
        required
        type="time"
      />
      <Input
        label="Drop-off date"
        min={offsetLocalCalendarDate(pickupDate, 1)}
        name="dropoffDate"
        onChange={(event) => setDropoffDate(event.target.value)}
        required
        type="date"
        value={dropoffDate}
      />
      <Input
        defaultValue={criteria.dropoffTime}
        label="Drop-off time"
        name="dropoffTime"
        required
        type="time"
      />
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
        <select
          className="ui-input"
          defaultValue={criteria.rentalMode}
          id="rentalMode"
          name="rentalMode"
        >
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
