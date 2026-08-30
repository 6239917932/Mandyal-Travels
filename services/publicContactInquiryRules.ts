import { isValidEmail, normalizeEmail } from '../lib/auth/validation.ts';

export const PUBLIC_CONTACT_BODY_LIMIT_BYTES = 8 * 1024;

export type PublicContactCategory = 'BOOKING_HELP' | 'CAR_OWNER' | 'GENERAL' | 'HOTEL_OWNER';

const CATEGORIES = new Set<PublicContactCategory>([
  'BOOKING_HELP',
  'CAR_OWNER',
  'GENERAL',
  'HOTEL_OWNER',
]);
const PHONE_PATTERN = /^[+()\-\s0-9]{7,30}$/;

function readText(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum + 1) : '';
}

export function normalizePublicContactInquiry(body: Record<string, unknown>) {
  const name = readText(body.name, 100);
  const email = normalizeEmail(readText(body.email, 254));
  const phone = readText(body.phone, 30);
  const message = readText(body.message, 2000);
  const rawCategory = readText(body.category, 30).toUpperCase();
  const category = CATEGORIES.has(rawCategory as PublicContactCategory)
    ? (rawCategory as PublicContactCategory)
    : null;

  if (name.length < 2 || name.length > 100) {
    return { error: 'Enter your name using 2 to 100 characters.', ok: false } as const;
  }
  if (!isValidEmail(email)) {
    return { error: 'Enter a valid email address.', ok: false } as const;
  }
  if (phone && !PHONE_PATTERN.test(phone)) {
    return { error: 'Enter a valid phone number or leave it blank.', ok: false } as const;
  }
  if (!category) {
    return { error: 'Choose a valid reason for contacting us.', ok: false } as const;
  }
  if (message.length < 10 || message.length > 2000) {
    return { error: 'Enter a message using 10 to 2,000 characters.', ok: false } as const;
  }

  return { data: { category, email, message, name, phone }, ok: true } as const;
}
