import { getPartnerAccess } from '@/lib/partnerAuth';
import { listPartnerDirectBookingOptions } from '@/services/partnerDirectBookingService';

export async function GET(request: Request) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL')
    return Response.json(
      { error: { code: 'HOTEL_PARTNER_REQUIRED', message: 'Hotel partner access is required.' } },
      { status: 403 },
    );
  return Response.json({ data: await listPartnerDirectBookingOptions(access.partnerId) });
}
