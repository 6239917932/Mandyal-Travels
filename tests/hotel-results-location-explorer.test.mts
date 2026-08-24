import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { HotelSearchResult } from '../types/hotel.ts';
import { createHotelResultsLocationMarkers } from '../utils/hotelResultsLocation.ts';

function result(id: string, latitude: number, longitude: number): HotelSearchResult {
  return {
    hotel: {
      amenities: [],
      checkInTime: '14:00',
      checkOutTime: '11:00',
      description: 'A verified fixture stay.',
      id,
      images: [],
      inventory: { source: 'direct' },
      location: {
        address: { city: 'Shimla', country: 'India', state: 'Himachal Pradesh' },
        latitude,
        longitude,
      },
      name: `Hotel ${id}`,
      policies: [],
      reviewSummary: { averageRating: 4.5, reviewCount: 10 },
      rooms: [],
      slug: `hotel-${id}`,
      starRating: 4,
    },
    isAvailable: true,
    minimumNightlyRate: { amount: 5000, currency: 'INR' },
    nights: 1,
    totalStayPrice: { amount: 5000, currency: 'INR' },
  };
}

test('location markers omit invalid and placeholder coordinates', () => {
  const markers = createHotelResultsLocationMarkers([
    result('valid', 31.1048, 77.1734),
    result('placeholder', 0, 0),
    result('latitude', 91, 77),
    result('longitude', 31, 181),
    result('not-finite', Number.NaN, 77),
  ]);

  assert.deepEqual(
    markers.map(({ hotelKey }) => hotelKey),
    ['hotel-valid'],
  );
  assert.equal(markers[0]?.xPercent, 50);
  assert.equal(markers[0]?.yPercent, 50);
});

test('location markers preserve result order and remain inside the padded plot', () => {
  const markers = createHotelResultsLocationMarkers([
    result('south-west', 26, 74),
    result('middle', 29, 77),
    result('north-east', 32, 80),
  ]);

  assert.deepEqual(
    markers.map(({ hotelKey }) => hotelKey),
    ['hotel-south-west', 'hotel-middle', 'hotel-north-east'],
  );
  assert.deepEqual(
    markers.map(({ xPercent, yPercent }) => [xPercent, yPercent]),
    [
      [10, 90],
      [50, 50],
      [90, 10],
    ],
  );
});

test('hotel results use the accessible local explorer without external map or source labels', async () => {
  const [page, explorer, plot, card] = await Promise.all([
    readFile(new URL('../app/hotels/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/hotel/HotelResultsExplorer.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/hotel/HotelResultsLocationPlot.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/hotel/HotelResultCard.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(
    page,
    /<HotelResultsExplorer markers=\{createHotelResultsLocationMarkers\(resultPage\.results\)\}>/,
  );
  assert.match(page, /<HotelResultCard/);
  assert.match(explorer, /aria-label="Available hotel results"/);
  assert.match(plot, /Relative positions from verified property coordinates/);
  assert.match(plot, /aria-pressed=/);
  assert.match(plot, /Hotels shown in location overview/);
  assert.match(card, /preload=\{eagerImage\}/);
  assert.match(card, /loading=\{eagerImage \? undefined : 'lazy'\}/);
  assert.doesNotMatch(explorer, /HotelSearchResult|inventory|supplier|externalPropertyId/);
  assert.doesNotMatch(
    `${explorer}\n${plot}`,
    /openstreetmap|google|inventory\.source|supplierName/i,
  );
});
