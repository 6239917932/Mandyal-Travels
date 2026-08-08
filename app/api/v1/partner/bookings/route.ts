import { isValidPartnerKey } from '@/lib/partnerAuth';
import { hotelBookingService } from '@/services/hotelBookingService';
import type { ApiErrorResponse } from '@/types/commerce';

export async function GET(request: Request): Promise<Response> {
  if (!isValidPartnerKey(request.headers.get('x-partner-key'))) {
    return Response.json(
      {
        error: { code: 'PARTNER_UNAUTHORIZED', message: 'Partner access is required.' },
      } satisfies ApiErrorResponse,
      { status: 401 },
    );
  }
  return Response.json({ data: await hotelBookingService.listPartnerBookings() });
}
