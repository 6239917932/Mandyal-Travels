import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hotelAmenityMatches,
  normalizeHotelAmenityList,
  normalizeHotelAmenityName,
} from '../lib/hotel/amenities.ts';

test('legacy and misspelled hotel amenities use the governed catalogue values', () => {
  assert.equal(normalizeHotelAmenityName('Wifi'), 'Free high-speed Wi-Fi');
  assert.equal(normalizeHotelAmenityName('Gyser'), 'Geyser / water heater');
  assert.equal(normalizeHotelAmenityName('Sweeming pool'), 'Swimming pool');
  assert.equal(normalizeHotelAmenityName('Free parking'), 'Free on-site parking');
});

test('amenity normalization preserves unknown values and removes canonical duplicates', () => {
  assert.deepEqual(
    normalizeHotelAmenityList([' Wifi ', 'Free Wi-Fi', 'Private cinema', 'Private   cinema']),
    ['Free high-speed Wi-Fi', 'Private cinema'],
  );
});

test('governed search filters match legacy amenity data', () => {
  assert.equal(hotelAmenityMatches('Sweeming pool', 'Swimming pool'), true);
  assert.equal(hotelAmenityMatches('Wifi', 'Free high-speed Wi-Fi'), true);
  assert.equal(hotelAmenityMatches('Paid laundry service', 'Swimming pool'), false);
});
