import { createHash } from 'node:crypto';

export const HOTEL_GUEST_IDENTITY_TYPES = [
  'AADHAAR_LAST4',
  'PASSPORT_LAST4',
  'DRIVING_LICENCE_LAST4',
  'VOTER_ID_LAST4',
] as const;

export type HotelGuestIdentityType = (typeof HOTEL_GUEST_IDENTITY_TYPES)[number];

export type HotelGuestRegistrationInput = Readonly<{
  consentRecorded: boolean;
  guestName: string;
  identityLast4: string;
  identityType: string;
  nationalityCountryCode: string;
  residenceCity: string;
}>;

export type NormalizedHotelGuestRegistration = Readonly<{
  consentRecorded: true;
  guestName: string;
  identityLast4: string;
  identityType: HotelGuestIdentityType;
  nationalityCountryCode: string;
  residenceCity: string;
}>;

export class HotelGuestRegistrationRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function normalizeText(value: string, maximum: number): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, maximum);
}

export function normalizeHotelGuestRegistration(
  input: HotelGuestRegistrationInput,
): NormalizedHotelGuestRegistration {
  const guestName = normalizeText(input.guestName, 100);
  const residenceCity = normalizeText(input.residenceCity, 80);
  const nationalityCountryCode = input.nationalityCountryCode.trim().toUpperCase();
  const identityType = input.identityType.trim().toUpperCase();
  const identityLast4 = input.identityLast4.trim().toUpperCase();

  if (guestName.length < 2 || /[<>\u0000-\u001F]/.test(guestName)) {
    throw new HotelGuestRegistrationRuleError(
      'INVALID_GUEST_NAME',
      'Enter the guest name as shown on the inspected identity document.',
    );
  }
  if (residenceCity.length < 2 || /[<>\u0000-\u001F]/.test(residenceCity)) {
    throw new HotelGuestRegistrationRuleError(
      'INVALID_RESIDENCE_CITY',
      'Enter a valid city of residence.',
    );
  }
  if (!/^[A-Z]{2}$/.test(nationalityCountryCode)) {
    throw new HotelGuestRegistrationRuleError(
      'INVALID_NATIONALITY',
      'Enter the two-letter nationality country code.',
    );
  }
  if (!HOTEL_GUEST_IDENTITY_TYPES.includes(identityType as HotelGuestIdentityType)) {
    throw new HotelGuestRegistrationRuleError(
      'INVALID_IDENTITY_TYPE',
      'Choose a supported identity document type.',
    );
  }
  if (
    (identityType === 'AADHAAR_LAST4' && !/^\d{4}$/.test(identityLast4)) ||
    (identityType !== 'AADHAAR_LAST4' && !/^[A-Z0-9]{4}$/.test(identityLast4))
  ) {
    throw new HotelGuestRegistrationRuleError(
      'INVALID_IDENTITY_REFERENCE',
      'Enter only the final four characters of the inspected document.',
    );
  }
  if (!input.consentRecorded) {
    throw new HotelGuestRegistrationRuleError(
      'CONSENT_REQUIRED',
      'Confirm that the guest was informed and consent or another lawful basis was recorded.',
    );
  }

  return {
    consentRecorded: true,
    guestName,
    identityLast4,
    identityType: identityType as HotelGuestIdentityType,
    nationalityCountryCode,
    residenceCity,
  };
}

export function hotelGuestRegistrationFingerprint(
  bookingId: string,
  input: NormalizedHotelGuestRegistration,
): string {
  return createHash('sha256')
    .update(
      [
        bookingId,
        input.guestName.toLocaleLowerCase('en-IN'),
        input.identityType,
        input.identityLast4,
      ]
        .join(':')
        .normalize('NFKC'),
      'utf8',
    )
    .digest('hex');
}

export function maskHotelGuestIdentity(identityLast4: string): string {
  return `•••• ${identityLast4}`;
}
