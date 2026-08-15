'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { FlightSearchCriteria } from '@/types/flight';

export function FlightSearchForm({ criteria }: { criteria: FlightSearchCriteria }) {
  const [tripType, setTripType] = useState(criteria.tripType);
  const second = criteria.multiCitySegments?.[1];
  const third = criteria.multiCitySegments?.[2];
  return (
    <form action="/flights" className="flight-search-form">
      <div className="ui-field">
        <label className="ui-field__label" htmlFor="tripType">
          Trip type
        </label>
        <select
          className="ui-input"
          id="tripType"
          name="tripType"
          onChange={(event) => setTripType(event.target.value as FlightSearchCriteria['tripType'])}
          value={tripType}
        >
          <option value="one-way">One way</option>
          <option value="return">Return</option>
          <option value="multi-city">Multi-city</option>
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
      {tripType === 'return' ? (
        <Input
          defaultValue={criteria.returnDate}
          label="Return"
          name="returnDate"
          required
          type="date"
        />
      ) : null}
      {tripType === 'multi-city' ? (
        <>
          <Input
            defaultValue={second?.origin ?? criteria.destination}
            label="Segment 2 from"
            maxLength={3}
            name="segment2Origin"
            required
          />
          <Input
            defaultValue={second?.destination ?? 'BLR'}
            label="Segment 2 to"
            maxLength={3}
            name="segment2Destination"
            required
          />
          <Input
            defaultValue={second?.departureDate ?? '2026-09-18'}
            label="Segment 2 departure"
            name="segment2Date"
            required
            type="date"
          />
          <Input
            defaultValue={third?.origin}
            label="Segment 3 from (optional)"
            maxLength={3}
            name="segment3Origin"
          />
          <Input
            defaultValue={third?.destination}
            label="Segment 3 to (optional)"
            maxLength={3}
            name="segment3Destination"
          />
          <Input
            defaultValue={third?.departureDate}
            label="Segment 3 departure (optional)"
            name="segment3Date"
            type="date"
          />
        </>
      ) : null}
      <Input
        defaultValue={criteria.adults}
        label="Adults"
        max="9"
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
