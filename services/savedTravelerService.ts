export const SAVED_TRAVELER_LIMIT = 12;
export const SAVED_TRAVELER_CSRF_HEADER = 'x-mandyal-csrf';
export const SAVED_TRAVELER_GENDERS = [
  '',
  'FEMALE',
  'MALE',
  'NON_BINARY',
  'PREFER_NOT_TO_SAY',
] as const;
export const SAVED_TRAVELER_RELATIONSHIPS = [
  'SELF',
  'SPOUSE',
  'CHILD',
  'PARENT',
  'SIBLING',
  'OTHER',
] as const;

export type SavedTravelerProfile = {
  dateOfBirth: string;
  email: string;
  firstName: string;
  gender: string;
  id: string;
  label: string;
  lastName: string;
  phone: string;
  relationship: string;
};

export type SavedTravelerInput = Omit<SavedTravelerProfile, 'id'>;

const ALLOWED_KEYS = new Set([
  'dateOfBirth',
  'email',
  'firstName',
  'gender',
  'label',
  'lastName',
  'phone',
  'relationship',
]);
const PERSON_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' .-]{1,79}$/u;

function text(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function validName(value: string) {
  return PERSON_NAME_PATTERN.test(value);
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeSavedTravelerInput(body: Record<string, unknown>) {
  if (Object.keys(body).some((key) => !ALLOWED_KEYS.has(key))) return null;
  const input: SavedTravelerInput = {
    dateOfBirth: text(body.dateOfBirth),
    email: text(body.email).toLowerCase(),
    firstName: text(body.firstName),
    gender: text(body.gender).toUpperCase(),
    label: text(body.label),
    lastName: text(body.lastName),
    phone: text(body.phone).replace(/[^\d+]/g, ''),
    relationship: text(body.relationship).toUpperCase(),
  };

  if (input.label.length < 1 || input.label.length > 40) return null;
  if (!validName(input.firstName) || !validName(input.lastName)) return null;
  if (!SAVED_TRAVELER_GENDERS.some((value) => value === input.gender)) return null;
  if (!SAVED_TRAVELER_RELATIONSHIPS.some((value) => value === input.relationship)) return null;
  if (input.email && !validEmail(input.email)) return null;
  if (input.phone && !/^\+?\d{10,15}$/.test(input.phone)) return null;
  if (input.dateOfBirth && !isPlausibleBirthDate(input.dateOfBirth, new Date())) return null;
  return input;
}

export function isPlausibleBirthDate(value: string, today: Date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const comparisonDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  if (Number.isNaN(comparisonDate.getTime()) || date > comparisonDate) return false;
  const oldest = new Date(comparisonDate);
  oldest.setUTCFullYear(oldest.getUTCFullYear() - 120);
  return date >= oldest;
}

export function ageFromBirthDate(value: string, today = new Date()) {
  if (!isPlausibleBirthDate(value, today)) return null;
  const [year, month, day] = value.split('-').map(Number);
  let age = today.getUTCFullYear() - year;
  if (
    today.getUTCMonth() + 1 < month ||
    (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)
  )
    age -= 1;
  return age;
}

export function bookingGenderValue(gender: string) {
  if (gender === 'FEMALE') return 'female';
  if (gender === 'MALE') return 'male';
  return gender ? 'other' : '';
}

export function hasSavedTravelerCsrf(request: Request) {
  return request.headers.get(SAVED_TRAVELER_CSRF_HEADER) === '1';
}
