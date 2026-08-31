export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_NAME_LENGTH = 80;

const COMMON_PASSWORDS = new Set([
  '1234567890',
  '123456789012',
  'admin12345',
  'adminadmin',
  'changeme123',
  'iloveyou123',
  'letmein123',
  'mandyaltravels',
  'password123',
  'password1234',
  'passw0rd123',
  'qwerty12345',
  'qwertyuiop',
  'welcome123',
]);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}

export function isValidName(name: string) {
  const normalizedName = name.trim();
  return normalizedName.length > 0 && normalizedName.length <= MAX_NAME_LENGTH;
}

export function isValidPassword(password: string) {
  return password.length >= 10 && password.length <= 128;
}

export function isAcceptableNewPassword(password: string) {
  if (!isValidPassword(password)) return false;
  const normalized = password.trim().toLowerCase();
  return !COMMON_PASSWORDS.has(normalized) && !/^(.)\1{9,}$/.test(normalized);
}
