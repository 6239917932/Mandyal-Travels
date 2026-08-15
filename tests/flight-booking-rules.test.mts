import assert from 'node:assert/strict';
import test from 'node:test';

import { hasValidFlightPassengerDetails } from '../lib/flight/bookingRules.ts';

const details = {
  passengerDraft: {
    contact: { email: 'traveller@example.com', phone: '+91 98765 43210' },
    passengers: [
      { firstName: 'Aarav', gender: 'male', lastName: "D'Souza" },
      { firstName: 'Maya', gender: 'female', lastName: 'Sharma' },
    ],
  },
};

test('flight booking accepts bounded passenger and contact details', () => {
  assert.equal(hasValidFlightPassengerDetails(details, 2), true);
});

test('flight booking rejects missing or mismatched passengers', () => {
  assert.equal(hasValidFlightPassengerDetails(details, 1), false);
  assert.equal(hasValidFlightPassengerDetails({}, 2), false);
});

test('flight booking rejects invalid identity, contact and gender values', () => {
  assert.equal(
    hasValidFlightPassengerDetails(
      {
        passengerDraft: {
          contact: { email: 'invalid', phone: '123' },
          passengers: [{ firstName: '<script>', gender: 'unknown', lastName: 'X' }],
        },
      },
      1,
    ),
    false,
  );
});
