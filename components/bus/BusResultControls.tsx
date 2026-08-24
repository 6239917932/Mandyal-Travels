import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { BusResultControls as Controls, BusSearchCriteria } from '@/types/bus';
import { busSearchCriteriaToQuery } from '@/utils/busSearchCriteria';
import type { BusResultControlCatalogue } from '@/utils/busResultControls';

export function BusResultControls({
  catalogue,
  controls,
  criteria,
}: {
  catalogue: BusResultControlCatalogue;
  controls: Controls;
  criteria: BusSearchCriteria;
}) {
  const searchCriteria = busSearchCriteriaToQuery(criteria);

  return (
    <form
      action="/buses"
      aria-label="Filter and sort bus results"
      className="flight-result-controls"
    >
      {Object.entries(searchCriteria).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <label className="ui-field">
        <span className="ui-field__label">Operator</span>
        <select className="ui-input" defaultValue={controls.operator ?? ''} name="operator">
          <option value="">All operators</option>
          {catalogue.operators.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Bus type</span>
        <select className="ui-input" defaultValue={controls.busType ?? ''} name="busType">
          <option value="">All bus types</option>
          {catalogue.busTypes.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <Input
        defaultValue={controls.maximumTotalPrice}
        label="Maximum total fare (INR)"
        max={10_000_000}
        min={1}
        name="maximumTotalPrice"
        step="0.01"
        type="number"
      />
      <label className="ui-field">
        <span className="ui-field__label">Sort results</span>
        <select className="ui-input" defaultValue={controls.sort} name="sort">
          <option value="price-ascending">Price: low to high</option>
          <option value="duration-ascending">Shortest journey</option>
          <option value="departure-ascending">Earliest departure</option>
          <option value="rating-descending">Highest rated</option>
        </select>
      </label>
      <label className="flight-result-controls__check">
        <input
          defaultChecked={controls.refundableOnly}
          name="refundableOnly"
          type="checkbox"
          value="true"
        />{' '}
        Refundable services only
      </label>
      <Button type="submit">Apply filters</Button>
      <Link
        className="ui-button ui-button--secondary"
        href={{ pathname: '/buses', query: searchCriteria }}
      >
        Clear filters
      </Link>
    </form>
  );
}
