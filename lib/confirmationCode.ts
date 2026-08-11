const BOOKING_REFERENCE_BYTES = 6;

export type BookingReferencePrefix = 'MB' | 'MC' | 'MF' | 'MT';

export function createBookingReference(prefix: BookingReferencePrefix): string {
  const randomBytes = new Uint8Array(BOOKING_REFERENCE_BYTES);
  globalThis.crypto.getRandomValues(randomBytes);

  const randomPart = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  return `${prefix}${randomPart}`;
}
