import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminSupplyCatalogPath,
  assessPropertyContent,
  internalInventorySource,
  normalizeAdminSupplyCatalogFilters,
} from '../services/adminSupplyCatalogService.ts';

const completeProperty = {
  activeRatePlans: 1,
  activeRooms: 1,
  amenitiesJson: '["Wi-Fi"]',
  city: 'Shimla',
  description: 'A sufficiently detailed description for platform review.',
  district: 'Shimla',
  imageUrl: 'https://example.com/hotel.jpg',
  imageUrlsJson: '[]',
  latitude: 31.1048,
  locality: 'Mall Road',
  longitude: 77.1734,
  policiesJson: '["Photo identification required"]',
  state: 'Himachal Pradesh',
  streetAddress: '1 Mall Road',
};

test('admin supply catalog filters accept only bounded closed-catalogue values', () => {
  assert.deepEqual(
    normalizeAdminSupplyCatalogFilters({
      approval: 'approved',
      content: 'ready',
      page: '3',
      publication: 'published',
      q: `  ${'hotel '.repeat(30)}  `,
      source: 'direct',
    }),
    {
      approval: 'APPROVED',
      content: 'READY',
      page: 3,
      publication: 'PUBLISHED',
      query: 'hotel '.repeat(30).trim().slice(0, 100),
      source: 'DIRECT',
    },
  );
  assert.deepEqual(normalizeAdminSupplyCatalogFilters({ page: '-1', source: 'cashfree' }), {
    approval: 'ALL',
    content: 'ALL',
    page: 1,
    publication: 'ALL',
    query: '',
    source: 'ALL',
  });
});

test('property content assessment reports exact missing review checks', () => {
  assert.deepEqual(assessPropertyContent(completeProperty), {
    completeChecks: 8,
    missing: [],
    ready: true,
    totalChecks: 8,
  });
  const incomplete = assessPropertyContent({
    ...completeProperty,
    activeRatePlans: 0,
    amenitiesJson: 'invalid',
    latitude: 0,
    longitude: 0,
  });
  assert.equal(incomplete.ready, false);
  assert.deepEqual(incomplete.missing, ['Map coordinates', 'Amenities', 'Active rate plan']);
});

test('inventory provenance remains an internal direct or external classification', () => {
  assert.equal(internalInventorySource('MANAGED'), 'DIRECT');
  assert.equal(internalInventorySource('ASSIGNED'), 'EXTERNAL');
  assert.equal(internalInventorySource('ASSIGNED', 'direct'), 'DIRECT');
  assert.equal(internalInventorySource('MANAGED', 'supplier'), 'EXTERNAL');
});

test('catalog pagination preserves active filters', () => {
  const filters = normalizeAdminSupplyCatalogFilters({
    approval: 'pending_review',
    content: 'needs_attention',
    q: 'Shimla',
    source: 'external',
  });
  assert.equal(
    adminSupplyCatalogPath(filters, 0),
    '/admin/catalog?page=1&q=Shimla&source=EXTERNAL&approval=PENDING_REVIEW&content=NEEDS_ATTENTION',
  );
});
