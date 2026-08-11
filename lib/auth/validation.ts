export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_NAME_LENGTH = 80;

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
