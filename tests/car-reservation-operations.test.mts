import assert from 'node:assert/strict';
import test from 'node:test';
import { nextCarReservationState } from '../lib/car/reservationOperations.ts';

const reservation = { dropoffDate: '2026-08-20', pickupDate: '2026-08-18', today: '2026-08-18' };

test('car rental pickup and completion follow the operational lifecycle', () => {
  assert.equal(
    nextCarReservationState({ ...reservation, action: 'PICK_UP', status: 'CONFIRMED' }),
    'PICKED_UP',
  );
  assert.equal(
    nextCarReservationState({ ...reservation, action: 'COMPLETE', status: 'PICKED_UP' }),
    'COMPLETED',
  );
});

test('car rental operations reject future pickup and invalid transitions', () => {
  assert.throws(() =>
    nextCarReservationState({
      ...reservation,
      action: 'PICK_UP',
      status: 'CONFIRMED',
      today: '2026-08-17',
    }),
  );
  assert.throws(() =>
    nextCarReservationState({ ...reservation, action: 'COMPLETE', status: 'CONFIRMED' }),
  );
});

test('car rental no-show is available only on or after pickup', () => {
  assert.equal(
    nextCarReservationState({ ...reservation, action: 'MARK_NO_SHOW', status: 'CONFIRMED' }),
    'NO_SHOW',
  );
  assert.throws(() =>
    nextCarReservationState({
      ...reservation,
      action: 'MARK_NO_SHOW',
      status: 'CONFIRMED',
      today: '2026-08-17',
    }),
  );
});
