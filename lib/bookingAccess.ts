export const legacyBookingAccessCookieName = 'mandyal_booking_access';

export function getBookingAccessCookieName(confirmationCode: string): string {
  return `mandyal_booking_access_${confirmationCode.toLowerCase()}`;
}

export const bookingAccessCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};
