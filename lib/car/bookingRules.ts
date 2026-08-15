export interface CarDriverDetails {
  firstName: string;
  lastName: string;
  age: number;
  license: string;
  email: string;
  phone: string;
}

export interface CarTravellerDetails {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const PERSON_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' .-]{1,79}$/u;
const LICENSE_PATTERN = /^[A-Z0-9][A-Z0-9 -]{4,38}[A-Z0-9]$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readText(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

export function parseCarDriverDetails(details: unknown): CarDriverDetails | undefined {
  const detailRecord = readRecord(details);
  const driver = detailRecord ? readRecord(detailRecord.driver) : undefined;
  if (!driver) return undefined;

  const firstName = readText(driver, 'firstName');
  const lastName = readText(driver, 'lastName');
  const license = readText(driver, 'license')?.toUpperCase().replace(/\s+/g, ' ');
  const email = readText(driver, 'email')?.toLowerCase();
  const rawPhone = readText(driver, 'phone');
  const phone = rawPhone?.replace(/\D/g, '');
  const age = driver.age;

  if (
    !firstName ||
    !PERSON_NAME_PATTERN.test(firstName) ||
    !lastName ||
    !PERSON_NAME_PATTERN.test(lastName) ||
    !Number.isInteger(age) ||
    (age as number) < 21 ||
    (age as number) > 80 ||
    !license ||
    !LICENSE_PATTERN.test(license) ||
    !email ||
    email.length > 254 ||
    !EMAIL_PATTERN.test(email) ||
    !phone ||
    phone.length < 10 ||
    phone.length > 15
  ) {
    return undefined;
  }

  return { age: age as number, email, firstName, lastName, license, phone };
}

export function hasValidCarDriverDetails(details: unknown): boolean {
  return parseCarDriverDetails(details) !== undefined;
}

export function parseCarTravellerDetails(details: unknown): CarTravellerDetails | undefined {
  const detailRecord = readRecord(details);
  const traveller = detailRecord ? readRecord(detailRecord.traveller) : undefined;
  if (!traveller) return undefined;
  const firstName = readText(traveller, 'firstName');
  const lastName = readText(traveller, 'lastName');
  const email = readText(traveller, 'email')?.toLowerCase();
  const phone = readText(traveller, 'phone')?.replace(/\D/g, '');
  if (
    !firstName ||
    !PERSON_NAME_PATTERN.test(firstName) ||
    !lastName ||
    !PERSON_NAME_PATTERN.test(lastName) ||
    !email ||
    email.length > 254 ||
    !EMAIL_PATTERN.test(email) ||
    !phone ||
    phone.length < 10 ||
    phone.length > 15
  ) {
    return undefined;
  }
  return { email, firstName, lastName, phone };
}

export function hasValidCarBookingParty(
  details: unknown,
  rentalMode: 'self-drive' | 'chauffeur',
): boolean {
  return rentalMode === 'chauffeur'
    ? parseCarTravellerDetails(details) !== undefined
    : parseCarDriverDetails(details) !== undefined;
}
