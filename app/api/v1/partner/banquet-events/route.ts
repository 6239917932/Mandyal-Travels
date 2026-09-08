import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { HotelBanquetRuleError } from '@/lib/pms/banquets';
import { createPartnerBanquetEvent, PartnerBanquetError } from '@/services/partnerBanquetService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (
    !access?.partnerId ||
    !access.userId ||
    access.partnerType !== 'HOTEL' ||
    access.memberRole !== 'ADMIN'
  ) {
    return failure('PARTNER_ADMIN_REQUIRED', 'A hotel partner administrator is required.', 403);
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_BANQUET_EVENT', 'Enter valid event details.', 400);
  try {
    const event = await createPartnerBanquetEvent({
      actorUserId: access.userId,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      endTime: body.endTime,
      eventDate: body.eventDate,
      eventName: body.eventName,
      eventType: body.eventType,
      expectedGuests: body.expectedGuests,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      organizerName: body.organizerName,
      partnerId: access.partnerId,
      propertyId: String(body.propertyId ?? ''),
      quoteAmount: body.quoteAmount,
      requirements: body.requirements,
      startTime: body.startTime,
      venueName: body.venueName,
    });
    return Response.json({ data: { id: event.id, status: event.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof HotelBanquetRuleError || error instanceof PartnerBanquetError) {
      return failure(error.code, error.message, 409);
    }
    return failure('BANQUET_EVENT_FAILED', 'The event could not be recorded.', 500);
  }
}
