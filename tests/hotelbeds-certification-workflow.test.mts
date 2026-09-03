import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertHotelbedsBookingReady,
  buildHotelbedsAvailabilityRequest,
  buildHotelbedsBookingRequest,
  buildHotelbedsCheckRateRequest,
  createHotelbedsCertificationState,
  extractHotelbedsRateDisclosures,
  extractHotelbedsRates,
  HOTELBEDS_BOOKING_TIMEOUT_MS,
  hotelbedsBookingPath,
  hotelbedsCancellationPath,
  recordHotelbedsAvailability,
  recordHotelbedsCheckRate,
  selectHotelbedsRate,
  shouldRequestHotelbedsCheckRate,
  inspectHotelbedsRateDisclosure,
} from '../lib/hotel/hotelbedsCertification.ts';
import { HotelbedsEvaluationAdapter } from '../repositories/hotelbedsEvaluationAdapter.ts';

test('availability groups hotels and every occupancy into one validated request', () => {
  assert.deepEqual(
    buildHotelbedsAvailabilityRequest({
      checkIn: '2026-09-20',
      checkOut: '2026-09-22',
      hotelCodes: [1067, 1070, 1067],
      occupancies: [
        { adults: 2, rooms: 1 },
        { adults: 3, childAges: [7], rooms: 1 },
      ],
    }),
    {
      hotels: { hotel: [1067, 1070] },
      occupancies: [
        { adults: 2, children: 0, rooms: 1 },
        { adults: 3, children: 1, paxes: [{ age: 7, type: 'CH' }], rooms: 1 },
      ],
      sourceMarket: 'IN',
      stay: { checkIn: '2026-09-20', checkOut: '2026-09-22' },
    },
  );
});

test('availability rejects invalid dates, child ages, and calls above 2,000 hotels', () => {
  const base = {
    checkIn: '2026-09-20',
    checkOut: '2026-09-22',
    hotelCodes: [1067],
    occupancies: [{ adults: 2, rooms: 1 }],
  } as const;
  assert.throws(
    () => buildHotelbedsAvailabilityRequest({ ...base, checkOut: '2026-09-20' }),
    /after check-in/,
  );
  assert.throws(
    () =>
      buildHotelbedsAvailabilityRequest({
        ...base,
        occupancies: [{ adults: 2, childAges: [18], rooms: 1 }],
      }),
    /age must be an integer from 0 to 17/,
  );
  assert.throws(
    () =>
      buildHotelbedsAvailabilityRequest({
        ...base,
        hotelCodes: Array.from({ length: 2_001 }, (_, index) => index + 1),
      }),
    /at most 2000 hotels/,
  );
});

test('CheckRate is limited to RECHECK rates and batches at most ten keys', () => {
  assert.equal(shouldRequestHotelbedsCheckRate('BOOKABLE'), false);
  assert.equal(shouldRequestHotelbedsCheckRate('RECHECK'), true);
  assert.deepEqual(buildHotelbedsCheckRateRequest([' rate-1 ', 'rate-1', 'rate-2']), {
    rooms: [{ rateKey: 'rate-1' }, { rateKey: 'rate-2' }],
  });
  assert.throws(
    () => buildHotelbedsCheckRateRequest(Array.from({ length: 11 }, (_, index) => `r-${index}`)),
    /at most 10 rates/,
  );
});

test('certification state prevents repeated availability and unnecessary CheckRate', () => {
  const available = recordHotelbedsAvailability(createHotelbedsCertificationState());
  assert.throws(() => recordHotelbedsAvailability(available), /must not be repeated/);

  const bookable = selectHotelbedsRate(available, { rateKey: 'bookable', rateType: 'BOOKABLE' });
  assertHotelbedsBookingReady(bookable);
  assert.throws(() => recordHotelbedsCheckRate(bookable), /only for a RECHECK/);

  const recheck = selectHotelbedsRate(available, { rateKey: 'recheck', rateType: 'RECHECK' });
  assert.throws(() => assertHotelbedsBookingReady(recheck), /not ready/);
  const checked = recordHotelbedsCheckRate(recheck);
  assertHotelbedsBookingReady(checked);
  assert.equal(checked.availabilityCalls, 1);
  assert.equal(checked.checkRateCalls, 1);
  assert.ok(HOTELBEDS_BOOKING_TIMEOUT_MS >= 60_000);
});

test('rate parser tolerates unknown additive fields and ignores malformed rates', () => {
  assert.deepEqual(
    extractHotelbedsRates({
      futureField: true,
      hotels: {
        hotels: [
          {
            rooms: [
              {
                rates: [
                  { futureRateField: 'safe', rateKey: 'a', rateType: 'BOOKABLE' },
                  { rateKey: 'b', rateType: 'RECHECK' },
                  { rateKey: 5, rateType: 'BOOKABLE' },
                  { rateKey: 'c', rateType: 'FUTURE' },
                ],
              },
            ],
          },
        ],
      },
    }),
    [
      { rateKey: 'a', rateType: 'BOOKABLE' },
      { rateKey: 'b', rateType: 'RECHECK' },
    ],
  );
});

test('rate disclosures preserve mandatory pre-booking information without trusting malformed fields', () => {
  const [rate] = extractHotelbedsRateDisclosures({
    hotels: {
      hotels: [
        {
          categoryName: '4 STARS',
          code: 1067,
          name: 'Evaluation Hotel',
          rooms: [
            {
              code: 'DBT.SU',
              name: 'Double or Twin Superior',
              rates: [
                {
                  boardCode: 'HB',
                  boardName: 'Half board',
                  cancellationPolicies: [
                    { amount: '50.01', from: '2026-09-19T23:59:00+05:30' },
                    { amount: 5, from: 'invalid' },
                  ],
                  futureField: true,
                  packaging: false,
                  promotions: [
                    { code: '073', name: 'Non-refundable rate. No amendments permitted' },
                  ],
                  rateComments: 'Local destination rules apply.',
                  rateCommentsId: '102|166598|0',
                  rateKey: 'rate-key',
                  rateType: 'BOOKABLE',
                },
              ],
            },
          ],
        },
      ],
    },
  });

  assert.deepEqual(rate, {
    boardCode: 'HB',
    boardName: 'Half board',
    cancellationPolicies: [{ amount: '50.01', from: '2026-09-19T23:59:00+05:30' }],
    hotelCategory: '4 STARS',
    hotelCode: 1067,
    hotelName: 'Evaluation Hotel',
    packaging: false,
    promotions: [{ code: '073', name: 'Non-refundable rate. No amendments permitted' }],
    rateComments: 'Local destination rules apply.',
    rateCommentsId: '102|166598|0',
    rateKey: 'rate-key',
    rateType: 'BOOKABLE',
    roomCode: 'DBT.SU',
    roomName: 'Double or Twin Superior',
  });
  assert.deepEqual(inspectHotelbedsRateDisclosure(rate), {
    missing: [],
    readyForPreBookingDisplay: true,
  });
});

test('rate disclosures fail readiness for unresolved comments and opaque standalone rates', () => {
  const readiness = inspectHotelbedsRateDisclosure({
    cancellationPolicies: [],
    packaging: true,
    promotions: [],
    rateCommentsId: '102|166598|0',
    rateKey: 'opaque-rate',
    rateType: 'RECHECK',
  });
  assert.equal(readiness.readyForPreBookingDisplay, false);
  assert.deepEqual(readiness.missing, [
    'hotel name',
    'room type',
    'board type',
    'resolved rate comments',
    'standalone-sale eligibility for opaque/package rate',
  ]);
});

test('evaluation adapter signs gzip Availability and CheckRate requests without booking', async () => {
  const requests: Array<{ body: string | undefined; headers: Headers; url: string }> = [];
  const providerFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      body: typeof init?.body === 'string' ? init.body : undefined,
      headers: new Headers(init?.headers),
      url: String(input),
    });
    return Response.json({ hotels: { hotels: [] } });
  }) as typeof fetch;
  const adapter = new HotelbedsEvaluationAdapter(
    { apiKey: 'key', environment: 'evaluation', secret: 'secret' },
    providerFetch,
    () => 1_724_841_000_000,
  );

  await adapter.searchAvailability({
    checkIn: '2026-09-20',
    checkOut: '2026-09-22',
    hotelCodes: [1067],
    occupancies: [{ adults: 2, rooms: 1 }],
  });
  await adapter.checkRates(['rate-key']);

  assert.deepEqual(
    requests.map((request) => request.url),
    [
      'https://api-mtls.test.hotelbeds.com/hotel-api/1.0/hotels',
      'https://api-mtls.test.hotelbeds.com/hotel-api/1.0/checkrates',
    ],
  );
  for (const request of requests) {
    assert.equal(request.headers.get('Accept-Encoding'), 'gzip');
    assert.equal(request.headers.get('Content-Type'), 'application/json');
    assert.equal(request.headers.get('Api-key'), 'key');
    assert.equal(JSON.stringify(request).includes('secret'), false);
    assert.ok(request.body);
  }
});

test('booking request preserves room passengers and requires child ages', () => {
  assert.deepEqual(
    buildHotelbedsBookingRequest({
      clientReference: 'MT-TEST-1',
      holder: { name: 'Booking', surname: 'Test' },
      remark: 'Certification booking only.',
      rooms: [
        {
          rateKey: 'rate-key',
          paxes: [
            { name: 'Adult', roomId: 1, surname: 'One', type: 'AD' },
            { age: 7, name: 'Child', roomId: 1, surname: 'One', type: 'CH' },
          ],
        },
      ],
      tolerance: 2,
    }),
    {
      clientReference: 'MT-TEST-1',
      holder: { name: 'Booking', surname: 'Test' },
      remark: 'Certification booking only.',
      rooms: [
        {
          rateKey: 'rate-key',
          paxes: [
            { name: 'Adult', roomId: 1, surname: 'One', type: 'AD' },
            { age: 7, name: 'Child', roomId: 1, surname: 'One', type: 'CH' },
          ],
        },
      ],
      tolerance: 2,
    },
  );
  assert.throws(
    () =>
      buildHotelbedsBookingRequest({
        clientReference: 'MT-TEST-2',
        holder: { name: 'Booking', surname: 'Test' },
        rooms: [
          {
            rateKey: 'rate-key',
            paxes: [{ name: 'Child', roomId: 1, surname: 'One', type: 'CH' }],
          },
        ],
      }),
    /child 1 age/,
  );
});

test('booking detail and cancellation paths are bounded and encoded safely', () => {
  assert.equal(hotelbedsBookingPath('1-123456'), '/hotel-api/1.0/bookings/1-123456');
  assert.equal(
    hotelbedsCancellationPath('1-123456', 'SIMULATION'),
    '/hotel-api/1.0/bookings/1-123456?cancellationFlag=SIMULATION',
  );
  assert.throws(() => hotelbedsBookingPath('../secret'), /invalid format/);
});

test('booking, detail, and cancellation use only guarded mTLS endpoints', async () => {
  const requests: Array<{ method: string | undefined; url: string }> = [];
  const providerFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ method: init?.method, url: String(input) });
    return Response.json({ booking: { reference: '1-123456' } });
  }) as typeof fetch;
  const adapter = new HotelbedsEvaluationAdapter(
    { apiKey: 'key', environment: 'evaluation', secret: 'secret' },
    providerFetch,
    () => 1_724_841_000_000,
  );
  await adapter.createBooking({
    clientReference: 'MT-TEST-3',
    holder: { name: 'Booking', surname: 'Test' },
    rooms: [
      {
        rateKey: 'rate-key',
        paxes: [{ name: 'Adult', roomId: 1, surname: 'One', type: 'AD' }],
      },
    ],
  });
  await adapter.getBooking('1-123456');
  await adapter.cancelBooking('1-123456', 'SIMULATION');
  assert.deepEqual(requests, [
    {
      method: 'POST',
      url: 'https://api-mtls.test.hotelbeds.com/hotel-api/1.0/bookings',
    },
    {
      method: 'GET',
      url: 'https://api-mtls.test.hotelbeds.com/hotel-api/1.0/bookings/1-123456',
    },
    {
      method: 'DELETE',
      url: 'https://api-mtls.test.hotelbeds.com/hotel-api/1.0/bookings/1-123456?cancellationFlag=SIMULATION',
    },
  ]);
});
