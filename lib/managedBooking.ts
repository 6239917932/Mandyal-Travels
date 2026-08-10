import { cookies } from 'next/headers';

import { getCurrentUser } from '@/lib/auth/session';
import { getBookingAccessCookieName, legacyBookingAccessCookieName } from '@/lib/bookingAccess';
import { hotelBookingService } from '@/services/hotelBookingService';
import type { ManagedHotelBooking } from '@/types/commerce';

export async function getAuthorizedManagedBooking(
  confirmationCode: string,
): Promise<ManagedHotelBooking | undefined> {
  const cookieStore = await cookies();
  const accessToken =
    cookieStore.get(getBookingAccessCookieName(confirmationCode))?.value ??
    cookieStore.get(legacyBookingAccessCookieName)?.value;
  if (accessToken) {
    const booking = await hotelBookingService.getManagedBooking(confirmationCode, accessToken);
    if (booking) {
      return booking;
    }
  }

  const user = await getCurrentUser();
  if (!user) {
    return undefined;
  }

  return hotelBookingService.getManagedBookingForGuest(confirmationCode, user.email);
}
