import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasValidBusPassengerDetails,
  parseBusSeats,
  seatsFitBusCapacity,
} from '../lib/bus/bookingRules.ts';

const details = {
  passengerDraft: {
    contact: { email: 'guest@example.com', phone: '+91 98765 43210' },
    travelers: [
      { age: 34, firstName: 'Asha', gender: 'female', lastName: 'Singh' },
      { age: 36, firstName: 'Ravi', gender: 'male', lastName: 'Kumar' },
    ],
  },
};

test('bus booking requires an exact set of unique valid seats', () => {
  assert.deepEqual(parseBusSeats('1a, 2D', 2), ['1A', '2D']);
  assert.equal(parseBusSeats('1A,1A', 2), undefined);
  assert.equal(parseBusSeats('1A', 2), undefined);
  assert.equal(parseBusSeats('driver-seat,2D', 2), undefined);
});

test('bus booking validates exact passenger and contact details', () => {
  assert.equal(hasValidBusPassengerDetails(details, 2), true);
  assert.equal(hasValidBusPassengerDetails(details, 1), false);
  assert.equal(
    hasValidBusPassengerDetails(
      {
        passengerDraft: {
          ...details.passengerDraft,
          travelers: [{ ...details.passengerDraft.travelers[0], gender: 'invalid' }],
        },
      },
      1,
    ),
    false,
  );
});

test('direct bus seats must exist within the operator capacity', () => {
  assert.equal(seatsFitBusCapacity(['1A', '10D'], 40), true);
  assert.equal(seatsFitBusCapacity(['10D', '11A'], 40), false);
  assert.equal(seatsFitBusCapacity(['20D'], 80), true);
  assert.equal(seatsFitBusCapacity(['21A'], 80), false);
});
