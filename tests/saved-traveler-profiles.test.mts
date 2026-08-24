import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ageFromBirthDate,
  bookingGenderValue,
  hasSavedTravelerCsrf,
  normalizeSavedTravelerInput,
  SAVED_TRAVELER_LIMIT,
} from '../services/savedTravelerService.ts';

test('saved traveler input accepts only bounded safe booking fields', () => {
  assert.deepEqual(
    normalizeSavedTravelerInput({
      dateOfBirth: '1990-06-15',
      email: ' TRAVELER@EXAMPLE.COM ',
      firstName: ' Jasveer ',
      gender: 'male',
      label: ' Work traveler ',
      lastName: ' Singh ',
      phone: '+91 98765 43210',
      relationship: 'self',
    }),
    {
      dateOfBirth: '1990-06-15',
      email: 'traveler@example.com',
      firstName: 'Jasveer',
      gender: 'MALE',
      label: 'Work traveler',
      lastName: 'Singh',
      phone: '+919876543210',
      relationship: 'SELF',
    },
  );
  assert.equal(
    normalizeSavedTravelerInput({
      firstName: 'Jasveer',
      label: 'Unsafe',
      lastName: 'Singh',
      passportNumber: 'NEVER-STORE',
      relationship: 'SELF',
    }),
    null,
  );
  assert.equal(normalizeSavedTravelerInput({ firstName: 'A', label: '', lastName: '' }), null);
  for (const invalidName of ['J', '<script>', 'Jasveer\u0000Singh', '1234']) {
    assert.equal(
      normalizeSavedTravelerInput({
        dateOfBirth: '',
        email: '',
        firstName: invalidName,
        gender: '',
        label: 'Invalid',
        lastName: 'Singh',
        phone: '',
        relationship: 'OTHER',
      }),
      null,
    );
  }
});

test('saved traveler genders map into the booking form catalogue', () => {
  assert.equal(bookingGenderValue('FEMALE'), 'female');
  assert.equal(bookingGenderValue('MALE'), 'male');
  assert.equal(bookingGenderValue('NON_BINARY'), 'other');
  assert.equal(bookingGenderValue('PREFER_NOT_TO_SAY'), 'other');
  assert.equal(bookingGenderValue(''), '');
});

test('birth dates are plausible and produce travel-date age', () => {
  assert.equal(ageFromBirthDate('2000-08-25', new Date('2026-08-24T00:00:00.000Z')), 25);
  assert.equal(ageFromBirthDate('2000-08-24', new Date('2026-08-24T00:00:00.000Z')), 26);
  assert.equal(ageFromBirthDate('2099-01-01', new Date('2026-08-24T00:00:00.000Z')), null);
  assert.equal(ageFromBirthDate('1906-08-24', new Date('2026-08-24T18:30:00.000Z')), 120);
});

test('saved traveler mutations require the dedicated CSRF header', () => {
  assert.equal(
    hasSavedTravelerCsrf(
      new Request('https://example.test/api/v1/account/travelers', {
        headers: { 'x-mandyal-csrf': '1' },
      }),
    ),
    true,
  );
  assert.equal(
    hasSavedTravelerCsrf(new Request('https://example.test/api/v1/account/travelers')),
    false,
  );
});

test('traveler APIs are exactly user scoped, capped, and disclosure safe', async () => {
  const [collection, item, schema, proxy] = await Promise.all([
    readFile(new URL('../app/api/v1/account/travelers/route.ts', import.meta.url), 'utf8'),
    readFile(
      new URL('../app/api/v1/account/travelers/[travelerId]/route.ts', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8'),
    readFile(new URL('../proxy.ts', import.meta.url), 'utf8'),
  ]);
  assert.equal(SAVED_TRAVELER_LIMIT, 12);
  assert.match(collection, /where: \{ userId: user\.id \}/);
  assert.match(collection, /isolationLevel: 'Serializable'/);
  assert.match(collection, /count >= SAVED_TRAVELER_LIMIT/);
  assert.match(item, /where: \{ id: travelerId, userId: user\.id \}/g);
  assert.match(collection, /hasSavedTravelerCsrf\(request\)/);
  assert.match(item, /hasSavedTravelerCsrf\(request\)/g);
  assert.match(collection, /isSameOriginMutation\(request\)/);
  assert.match(item, /isSameOriginMutation\(request\)/g);
  assert.match(collection, /action: 'SAVED_TRAVELER_MUTATION'/);
  assert.match(item, /action: 'SAVED_TRAVELER_MUTATION'/);
  assert.match(collection, /status: 429/);
  assert.match(item, /status: 429/);
  assert.match(proxy, /matcher: '\/api\/:path\*'/);
  assert.match(schema, /onDelete: Cascade/);
  for (const forbidden of [
    'passport',
    'governmentId',
    'paymentCard',
    'cardNumber',
    'licenseNumber',
  ]) {
    assert.doesNotMatch(`${collection}\n${item}\n${schema}`, new RegExp(forbidden, 'i'));
  }
});

test('booking prefill is lazy, explicit, and preserves entered values', async () => {
  const [picker, flight, bus, car, hotel] = await Promise.all([
    readFile(new URL('../components/account/SavedTravelerPicker.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/flight/FlightPassengerForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/bus/BusPassengerForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/car/CarDriverForm.tsx', import.meta.url), 'utf8'),
    readFile(
      new URL('../app/hotels/[slug]/booking/guest-details/page.tsx', import.meta.url),
      'utf8',
    ),
  ]);
  assert.match(picker, /async function openPicker\(\)/);
  assert.match(picker, /Use a saved traveler/);
  assert.match(picker, /Fill empty fields/);
  for (const form of [flight, bus, car, hotel]) {
    assert.match(form, /SavedTravelerPicker/);
    assert.match(form, /field\.value\.trim\(\) \|\| !value/);
  }
  assert.doesNotMatch(car, /fill\('license'/);
  assert.doesNotMatch(hotel, /fill\('specialRequests'/);
});

test('privacy export includes exactly user-owned saved profiles', async () => {
  const route = await readFile(
    new URL('../app/api/v1/account/export/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(route, /tx\.savedTraveler\.count\(\{ where: \{ userId: user\.id \} \}\)/);
  assert.match(route, /tx\.savedTraveler\.findMany/);
  assert.match(route, /where: \{ userId: user\.id \}/g);
  assert.match(route, /\{ email: user\.email, userId: null \}/);
  assert.doesNotMatch(route, /\{ email: user\.email \}\]/);
  assert.match(route, /savedTravelers,/);
});
