import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { searchableHotelAmenities } from '@/constants/hotelAmenities';
import type { HotelSearchCriteria, HotelSearchFilters } from '@/types/hotel';

interface HotelSearchFormProps {
  criteria: HotelSearchCriteria;
  filters: HotelSearchFilters;
}

export function HotelSearchForm({ criteria, filters }: HotelSearchFormProps) {
  return (
    <form action="/hotels" className="hotel-search-form">
      <Input
        defaultValue={criteria.destination}
        label="City, area, locality, or property"
        name="destination"
        placeholder="Bir Billing, Suja, Mandi, or hotel name"
      />

      <Input
        defaultValue={filters.centerLatitude ?? ''}
        label="Map latitude"
        max="90"
        min="-90"
        name="latitude"
        placeholder="Optional"
        step="any"
        type="number"
      />
      <Input
        defaultValue={filters.centerLongitude ?? ''}
        label="Map longitude"
        max="180"
        min="-180"
        name="longitude"
        placeholder="Optional"
        step="any"
        type="number"
      />
      <Input
        defaultValue={filters.radiusKm || ''}
        label="Radius (km)"
        max="500"
        min="0"
        name="radiusKm"
        placeholder="No radius"
        type="number"
      />

      <label className="ui-field">
        <span>Minimum rating</span>
        <select defaultValue={filters.minimumStarRating} name="minimumStarRating">
          <option value="0">Any star rating</option>
          <option value="3">3 stars or higher</option>
          <option value="4">4 stars or higher</option>
          <option value="5">5 stars only</option>
        </select>
      </label>

      <label className="ui-field">
        <span>Amenity</span>
        <select defaultValue={filters.amenity} name="amenity">
          <option value="">Any amenity</option>
          {searchableHotelAmenities.map((amenity) => (
            <option key={amenity} value={amenity}>
              {amenity}
            </option>
          ))}
        </select>
      </label>

      <Input
        defaultValue={filters.maximumNightlyRate || ''}
        label="Maximum nightly rate"
        min="0"
        name="maximumNightlyRate"
        placeholder="No maximum"
        type="number"
      />

      <label className="ui-field">
        <span>Sort results</span>
        <select defaultValue={filters.sort} name="sort">
          <option value="price-ascending">Price: low to high</option>
          <option value="price-descending">Price: high to low</option>
          <option value="rating-descending">Guest rating</option>
        </select>
      </label>

      <label className="hotel-search-form__checkbox">
        <input
          defaultChecked={filters.refundableOnly}
          name="refundableOnly"
          type="checkbox"
          value="true"
        />
        Refundable rates only
      </label>

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
