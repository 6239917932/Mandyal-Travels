import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { parsePartnerDirectQuoteRequest } from '@/lib/hotel/partnerDirectBookingRules';
import { getPartnerAccess } from '@/lib/partnerAuth';
import {
  createPartnerDirectQuote,
  PartnerDirectBookingError,
} from '@/services/partnerDirectBookingService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL')
    return failure('HOTEL_PARTNER_REQUIRED', 'Hotel partner access is required.', 403);
  const body = await readJsonObject(request);
  const values = body ? parsePartnerDirectQuoteRequest(body) : null;
  if (!values)
    return failure(
      'INVALID_DIRECT_QUOTE',
      'Enter valid stay, room, rate and occupancy details.',
      400,
    );
  try {
    return Response.json(
      { data: await createPartnerDirectQuote(access.partnerId, values) },
      { status: 201 },
    );
  } catch (error) {
    return error instanceof PartnerDirectBookingError
      ? failure(error.code, error.message, 409)
      : failure('DIRECT_QUOTE_FAILED', 'The stay could not be reviewed.', 500);
  }
}
