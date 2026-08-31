export const STANDARD_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const PLATFORM_ADMIN_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

export function sessionDurationMsForRole(role: string): number {
  return role === 'PLATFORM_ADMIN'
    ? PLATFORM_ADMIN_SESSION_DURATION_MS
    : STANDARD_SESSION_DURATION_MS;
}

export function sessionAbsoluteExpiry(role: string, createdAt: Date): Date {
  return new Date(createdAt.getTime() + sessionDurationMsForRole(role));
}
