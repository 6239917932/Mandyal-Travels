export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidPassword(password: string) {
  return password.length >= 10 && password.length <= 128;
}
