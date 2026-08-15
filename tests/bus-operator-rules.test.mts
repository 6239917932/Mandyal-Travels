import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeBusRoute,
  normalizeBusRouteStatus,
  normalizeBusTrip,
  normalizeBusTripControls,
} from '../lib/bus/operatorRules.ts';
test('bus operator routes and trips are normalized within bounds', () => {
  assert.equal(
    normalizeBusRoute({
      boardingPoint: '  ISBT Mandi ',
      destination: 'Delhi',
      droppingPoint: 'Kashmiri Gate',
      origin: 'Mandi',
    }).boardingPoint,
    'ISBT Mandi',
  );
  assert.deepEqual(
    normalizeBusTrip({
      amenities: ['Wi-Fi', 'Wi-Fi'],
      arrivalTime: '06:30',
      busType: 'AC Sleeper',
      cancellationPolicy: 'Free cancellation until 12 hours before departure.',
      departureTime: '22:30',
      pricePerSeat: 1200,
      refundable: true,
      seatCapacity: 36,
      serviceDate: '2026-09-20',
    }).amenities,
    ['Wi-Fi'],
  );
});
test('bus operator rules reject identical routes and unsafe trip values', () => {
  assert.throws(() =>
    normalizeBusRoute({
      boardingPoint: 'A stop',
      destination: 'Mandi',
      droppingPoint: 'B stop',
      origin: 'mandi',
    }),
  );
  assert.throws(() =>
    normalizeBusTrip({
      amenities: [],
      arrivalTime: '29:00',
      busType: 'AC',
      cancellationPolicy: 'No cancellation permitted.',
      departureTime: '22:00',
      pricePerSeat: 10,
      refundable: false,
      seatCapacity: 100,
      serviceDate: 'bad',
    }),
  );
});
test('bus operator rules reject services scheduled before today', () => {
  assert.throws(() =>
    normalizeBusTrip(
      {
        amenities: [],
        arrivalTime: '06:00',
        busType: 'AC Seater',
        cancellationPolicy: 'No cancellation permitted.',
        departureTime: '04:00',
        pricePerSeat: 800,
        refundable: false,
        seatCapacity: 30,
        serviceDate: '2026-08-14',
      },
      '2026-08-15',
    ),
  );
});
test('bus trip controls bound fares, capacity, and distribution state', () => {
  assert.deepEqual(
    normalizeBusTripControls({ pricePerSeat: 1500, seatCapacity: 40, status: ' paused ' }),
    { pricePerSeat: 1500, seatCapacity: 40, status: 'PAUSED' },
  );
  assert.throws(() =>
    normalizeBusTripControls({ pricePerSeat: 99, seatCapacity: 40, status: 'ACTIVE' }),
  );
  assert.throws(() =>
    normalizeBusTripControls({ pricePerSeat: 1500, seatCapacity: 81, status: 'ACTIVE' }),
  );
  assert.throws(() =>
    normalizeBusTripControls({ pricePerSeat: 1500, seatCapacity: 40, status: 'CANCELLED' }),
  );
});
test('bus route distribution can only be active or paused', () => {
  assert.equal(normalizeBusRouteStatus(' paused '), 'PAUSED');
  assert.equal(normalizeBusRouteStatus('active'), 'ACTIVE');
  assert.throws(() => normalizeBusRouteStatus('DELETED'));
});
