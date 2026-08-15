export const PRIVACY_REQUEST_TYPES = ['ACCESS', 'CORRECTION', 'DELETION', 'RESTRICTION'] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export function isPrivacyRequestType(value: string): value is PrivacyRequestType {
  return PRIVACY_REQUEST_TYPES.some((item) => item === value);
}

export function privacyRequestDueAt(now = new Date()): Date {
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1_000);
}
