import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type {
  CarResultControlCatalogue,
  CarResultControls as CarResultControlsValue,
  CarSearchCriteria,
} from '@/types/car';
import { carSearchCriteriaToQuery } from '@/utils/carResultControls';

export function CarResultControls({
  catalogue,
  controls,
  criteria,
}: {
  catalogue: CarResultControlCatalogue;
  controls: CarResultControlsValue;
  criteria: CarSearchCriteria;
}) {
  const searchCriteria = carSearchCriteriaToQuery(criteria);

  return (
    <form action="/cars" aria-label="Filter and sort car results" className="car-result-controls">
      {Object.entries(searchCriteria).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <label className="ui-field">
        <span className="ui-field__label">Provider</span>
        <select className="ui-input" defaultValue={controls.provider ?? ''} name="provider">
          <option value="">All providers</option>
          {catalogue.providers.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Vehicle category</span>
        <select className="ui-input" defaultValue={controls.category ?? ''} name="category">
          <option value="">All categories</option>
          {catalogue.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Transmission</span>
        <select className="ui-input" defaultValue={controls.transmission ?? ''} name="transmission">
          <option value="">Any transmission</option>
          <option value="Automatic">Automatic</option>
          <option value="Manual">Manual</option>
        </select>
      </label>
      <Input
        defaultValue={controls.minimumSeats}
        label="Seats (at least)"
        max={20}
        min={1}
        name="minimumSeats"
        step={1}
        type="number"
      />
      <Input
        defaultValue={controls.maximumTotalPrice}
        label="Maximum total price (INR)"
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
          <option value="vehicle-name-ascending">Vehicle name: A to Z</option>
        </select>
      </label>
      <div className="car-result-controls__actions">
        <Button type="submit">Apply filters</Button>
        <Link
          className="ui-button ui-button--secondary"
          href={{ pathname: '/cars', query: searchCriteria }}
        >
          Clear filters
        </Link>
      </div>
    </form>
  );
}
