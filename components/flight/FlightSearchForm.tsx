'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { FlightSearchCriteria } from '@/types/flight';
import { formatIndiaCalendarDate, offsetLocalCalendarDate } from '@/utils/localDate';

export function FlightSearchForm({ criteria }: { criteria: FlightSearchCriteria }) {
  const today = formatIndiaCalendarDate();
  const initialDeparture = criteria.departureDate >= today ? criteria.departureDate : today;
  const [tripType, setTripType] = useState(criteria.tripType);
  const second = criteria.multiCitySegments?.[1];
  const third = criteria.multiCitySegments?.[2];
  const [departureDate, setDepartureDate] = useState(initialDeparture);
  const [returnDate, setReturnDate] = useState(
    criteria.returnDate && criteria.returnDate > initialDeparture
      ? criteria.returnDate
      : offsetLocalCalendarDate(initialDeparture, 1),
  );
  const [secondDate, setSecondDate] = useState(
    second?.departureDate && second.departureDate >= initialDeparture
      ? second.departureDate
      : initialDeparture,
  );
  const [thirdDate, setThirdDate] = useState(
    third?.departureDate && third.departureDate >= (second?.departureDate ?? initialDeparture)
      ? third.departureDate
      : '',
  );
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
        label="Departure"
        min={today}
        name="departureDate"
        onChange={(event) => {
          const nextDeparture = event.target.value;
          setDepartureDate(nextDeparture);
          if (returnDate <= nextDeparture) {
            setReturnDate(offsetLocalCalendarDate(nextDeparture, 1));
          }
          if (secondDate < nextDeparture) {
            setSecondDate(nextDeparture);
          }
          if (thirdDate && thirdDate < nextDeparture) {
            setThirdDate(nextDeparture);
          }
        }}
        required
        type="date"
        value={departureDate}
      />
      {tripType === 'return' ? (
        <Input
          label="Return"
          min={offsetLocalCalendarDate(departureDate, 1)}
          name="returnDate"
          onChange={(event) => setReturnDate(event.target.value)}
          required
          type="date"
          value={returnDate}
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
            label="Segment 2 departure"
            min={departureDate}
            name="segment2Date"
            onChange={(event) => {
              const nextSecondDate = event.target.value;
              setSecondDate(nextSecondDate);
              if (thirdDate && thirdDate < nextSecondDate) setThirdDate(nextSecondDate);
            }}
            required
            type="date"
            value={secondDate}
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
            label="Segment 3 departure (optional)"
            min={secondDate}
            name="segment3Date"
            onChange={(event) => setThirdDate(event.target.value)}
            type="date"
            value={thirdDate}
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
