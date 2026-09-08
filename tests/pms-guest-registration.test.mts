import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  HotelGuestRegistrationRuleError,
  hotelGuestRegistrationFingerprint,
  maskHotelGuestIdentity,
  normalizeHotelGuestRegistration,
} from '../lib/pms/guestRegistration.ts';

const validInput = {
  consentRecorded: true,
  guestName: '  Jasveer   Singh ',
  identityLast4: 'a1b2',
  identityType: 'passport_last4',
  nationalityCountryCode: 'in',
  residenceCity: '  Mandi ',
};

test('guest registration normalizes only a masked document reference', () => {
  assert.deepEqual(normalizeHotelGuestRegistration(validInput), {
    consentRecorded: true,
    guestName: 'Jasveer Singh',
    identityLast4: 'A1B2',
    identityType: 'PASSPORT_LAST4',
    nationalityCountryCode: 'IN',
    residenceCity: 'Mandi',
  });
  assert.equal(maskHotelGuestIdentity('A1B2'), '•••• A1B2');
});

test('Aadhaar references accept exactly four final digits', () => {
  assert.equal(
    normalizeHotelGuestRegistration({
      ...validInput,
      identityLast4: '0123',
      identityType: 'AADHAAR_LAST4',
    }).identityLast4,
    '0123',
  );
  assert.throws(
    () =>
      normalizeHotelGuestRegistration({
        ...validInput,
        identityLast4: 'A123',
        identityType: 'AADHAAR_LAST4',
      }),
    (error) =>
      error instanceof HotelGuestRegistrationRuleError &&
      error.code === 'INVALID_IDENTITY_REFERENCE',
  );
});

test('guest registration requires consent, supported identity and a country code', () => {
  for (const input of [
    { ...validInput, consentRecorded: false },
    { ...validInput, identityType: 'FULL_AADHAAR' },
    { ...validInput, nationalityCountryCode: 'IND' },
  ]) {
    assert.throws(() => normalizeHotelGuestRegistration(input), HotelGuestRegistrationRuleError);
  }
});

test('registration fingerprints are stable and booking scoped', () => {
  const normalized = normalizeHotelGuestRegistration(validInput);
  assert.equal(
    hotelGuestRegistrationFingerprint('booking-1', normalized),
    hotelGuestRegistrationFingerprint('booking-1', normalized),
  );
  assert.notEqual(
    hotelGuestRegistrationFingerprint('booking-1', normalized),
    hotelGuestRegistrationFingerprint('booking-2', normalized),
  );
});

test('guest registration is partner scoped, same-origin, append-only and audited', async () => {
  const [route, service, page, form, bookingsPage, schema, migration] = await Promise.all([
    readFile(
      new URL(
        '../app/api/v1/partner/bookings/[confirmationCode]/guest-registrations/route.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(new URL('../services/partnerGuestRegistrationService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/pms/guest-registration/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/partner/GuestRegistrationForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/bookings/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../prisma/postgresql/migrations/20260907120000_add_hotel_guest_registration/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /access\.partnerType !== 'HOTEL'/);
  assert.match(service, /partnerId: input\.partnerId/);
  assert.match(service, /operationalStatus: \{ in: \['RESERVED', 'CHECKED_IN'\] \}/);
  assert.match(service, /action: 'HOTEL_GUEST_REGISTERED'/);
  assert.doesNotMatch(service, /hotelGuestRegistration\.(update|delete)/);
  assert.match(page, /access\.partnerType !== 'HOTEL'/);
  assert.match(form, /Do not enter a full identity number/);
  assert.match(bookingsPage, /\/partner\/pms\/guest-registration\?booking=/);
  assert.match(
    schema,
    /model HotelGuestRegistration[\s\S]*referenceFingerprint\s+String\s+@unique/,
  );
  assert.match(migration, /ON DELETE CASCADE/);
});
