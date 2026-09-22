import assert from 'node:assert/strict';
import test from 'node:test';

import { propertyAmenityGroups } from '../constants/hotelAmenities.ts';

test('property amenities appear once in the partner onboarding checklist', () => {
  const amenities = propertyAmenityGroups.flatMap((group) =>
    group.options.map((amenity) => amenity.value),
  );

  assert.equal(new Set(amenities).size, amenities.length);
});
