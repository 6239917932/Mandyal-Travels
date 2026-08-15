import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type {
  FlightResultControls as FlightResultControlsValue,
  FlightSearchCriteria,
} from '@/types/flight';
import { flightSearchCriteriaToQuery } from '@/utils/flightSearchCriteria';

export function FlightResultControls({
  airlines,
  controls,
  criteria,
}: {
  airlines: Array<{ code: string; name: string }>;
  controls: FlightResultControlsValue;
  criteria: FlightSearchCriteria;
}) {
  return (
    <form action="/flights" className="flight-result-controls">
      {Object.entries(flightSearchCriteriaToQuery(criteria)).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <div className="ui-field">
        <label className="ui-field__label" htmlFor="airline">
          Airline
        </label>
        <select
          className="ui-input"
          defaultValue={controls.airline ?? ''}
          id="airline"
          name="airline"
        >
          <option value="">All airlines</option>
          {airlines.map((airline) => (
            <option key={airline.code} value={airline.code}>
              {airline.name}
            </option>
          ))}
        </select>
      </div>
      <Input
        defaultValue={controls.maximumTotalPrice}
        label="Maximum total fare (INR)"
        min="1"
        name="maximumTotalPrice"
        type="number"
      />
      <div className="ui-field">
        <label className="ui-field__label" htmlFor="sort">
          Sort results
        </label>
        <select className="ui-input" defaultValue={controls.sort} id="sort" name="sort">
          <option value="price-ascending">Price: low to high</option>
          <option value="duration-ascending">Shortest total journey</option>
          <option value="departure-ascending">Earliest departure</option>
        </select>
      </div>
      <label className="flight-result-controls__check">
        <input
          defaultChecked={controls.refundableOnly}
          name="refundableOnly"
          type="checkbox"
          value="true"
        />
        Refundable fares only
      </label>
      <Button type="submit">Apply filters</Button>
    </form>
  );
}
