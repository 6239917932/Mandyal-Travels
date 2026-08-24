import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [busCard, carCard] = await Promise.all([
  readFile(new URL('../components/bus/BusOfferCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../components/car/CarOfferCard.tsx', import.meta.url), 'utf8'),
]);

test('public bus and car cards omit technical adapter provenance', () => {
  for (const card of [busCard, carCard]) {
    assert.doesNotMatch(card, /offer\.source/);
    assert.doesNotMatch(card, /Source:/);
  }
});

test('public cards retain customer-useful supply and availability facts', () => {
  assert.match(busCard, /offer\.operatorName/);
  assert.match(busCard, /offer\.seatsRemaining/);
  assert.match(carCard, /offer\.providerName/);
  assert.match(carCard, /offer\.carsRemaining/);
});

test('booking links retain governed offer and search identifiers', () => {
  assert.match(busCard, /pathname: '\/buses\/booking\/seats'/);
  assert.match(busCard, /offerId: offer\.id/);
  assert.match(busCard, /destination: criteria\.destination/);
  assert.match(busCard, /origin: criteria\.origin/);
  assert.match(busCard, /passengers: criteria\.passengers/);
  assert.match(busCard, /travelDate: criteria\.travelDate/);

  assert.match(carCard, /pathname: '\/cars\/booking'/);
  assert.match(carCard, /query: \{ \.\.\.criteria, offerId: offer\.id \}/);
});
