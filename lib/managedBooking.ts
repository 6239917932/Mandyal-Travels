import { cookies } from 'next/headers';

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
  if (!accessToken) {
    return undefined;
  }

  return hotelBookingService.getManagedBooking(confirmationCode, accessToken);
}
