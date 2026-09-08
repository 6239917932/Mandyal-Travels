import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { HotelBanquetRuleError } from '@/lib/pms/banquets';
import {
  PartnerBanquetError,
  transitionPartnerBanquetEvent,
} from '@/services/partnerBanquetService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
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
  if (!body) return failure('INVALID_BANQUET_ACTION', 'Enter a valid event action.', 400);
  const { eventId } = await context.params;
  try {
    const event = await transitionPartnerBanquetEvent({
      actorUserId: access.userId,
      banquetEventId: eventId,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      note: body.note,
      partnerId: access.partnerId,
      targetStatus: body.targetStatus,
      version: Number(body.version),
    });
    return Response.json({ data: { id: event.id, status: event.status } });
  } catch (error) {
    if (error instanceof HotelBanquetRuleError || error instanceof PartnerBanquetError) {
      return failure(error.code, error.message, 409);
    }
    return failure('BANQUET_ACTION_FAILED', 'The event could not be updated.', 500);
  }
}
