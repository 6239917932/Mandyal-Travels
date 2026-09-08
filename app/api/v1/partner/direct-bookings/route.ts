import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import {
  parsePartnerDirectBookingRequest,
  PARTNER_DIRECT_IDEMPOTENCY_PATTERN,
} from '@/lib/hotel/partnerDirectBookingRules';
import { getPartnerAccess } from '@/lib/partnerAuth';
import {
  confirmPartnerDirectBooking,
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
  const idempotencyKey = request.headers.get('x-idempotency-key') ?? '';
  if (!PARTNER_DIRECT_IDEMPOTENCY_PATTERN.test(idempotencyKey))
    return failure('INVALID_IDEMPOTENCY_KEY', 'Start this reservation again and retry.', 400);
  const body = await readJsonObject(request);
  const values = body ? parsePartnerDirectBookingRequest(body) : null;
  if (!values)
    return failure('INVALID_DIRECT_BOOKING', 'Enter valid guest and reviewed stay details.', 400);
  try {
    const result = await confirmPartnerDirectBooking(
      access.partnerId,
      access.userId,
      values,
      idempotencyKey,
    );
    return Response.json({ data: result.booking }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerDirectBookingError
      ? failure(error.code, error.message, 409)
      : failure('DIRECT_BOOKING_FAILED', 'The direct reservation could not be created.', 500);
  }
}
