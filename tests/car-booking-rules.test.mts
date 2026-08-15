import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasValidCarBookingParty,
  hasValidCarDriverDetails,
  parseCarDriverDetails,
  parseCarTravellerDetails,
} from '../lib/car/bookingRules.ts';

const validDetails = {
  driver: {
    age: 32,
    email: 'Driver@Example.com',
    firstName: 'Jasveer',
    lastName: 'Singh',
    license: ' hp 33 2024 1234567 ',
    phone: '+91 98765 43210',
  },
};

test('car booking accepts and normalizes a bounded primary driver', () => {
  assert.equal(hasValidCarDriverDetails(validDetails), true);
  assert.deepEqual(parseCarDriverDetails(validDetails), {
    age: 32,
    email: 'driver@example.com',
    firstName: 'Jasveer',
    lastName: 'Singh',
    license: 'HP 33 2024 1234567',
    phone: '919876543210',
  });
});

test('car booking rejects missing, underage and malformed driver details', () => {
  assert.equal(hasValidCarDriverDetails({}), false);
  assert.equal(hasValidCarDriverDetails({ driver: { ...validDetails.driver, age: 20 } }), false);
  assert.equal(
    hasValidCarDriverDetails({ driver: { ...validDetails.driver, license: '<script>' } }),
    false,
  );
  assert.equal(
    hasValidCarDriverDetails({ driver: { ...validDetails.driver, phone: '123' } }),
    false,
  );
});

test('chauffeur bookings require a valid lead traveller without driver credentials', () => {
  const details = {
    traveller: {
      email: 'Guest@Example.com',
      firstName: 'Divya',
      lastName: 'Sharma',
      phone: '+91 98765 43210',
    },
  };
  assert.equal(hasValidCarBookingParty(details, 'chauffeur'), true);
  assert.equal(hasValidCarBookingParty(details, 'self-drive'), false);
  assert.deepEqual(parseCarTravellerDetails(details), {
    email: 'guest@example.com',
    firstName: 'Divya',
    lastName: 'Sharma',
    phone: '919876543210',
  });
});
