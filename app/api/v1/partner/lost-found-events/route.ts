import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerLostFoundError,
  recordPartnerLostFoundEvent,
} from '@/services/partnerLostFoundService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL')
    return failure('HOTEL_PARTNER_REQUIRED', 'A hotel partner account is required.', 403);
  const body = await readJsonObject(request);
  if (!body)
    return failure('INVALID_LOST_FOUND_ACTION', 'Enter valid custody action details.', 400);
  try {
    const event = await recordPartnerLostFoundEvent({
      actorUserId: access.userId,
      allowDisposal: access.memberRole === 'ADMIN',
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      partnerId: access.partnerId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: `LOST_FOUND_ITEM_${event.action}`,
      entityId: event.itemId,
      entityType: 'HOTEL_LOST_FOUND_ITEM',
      summary: `${event.toStatus.toLowerCase().replaceAll('_', ' ')} custody evidence recorded.`,
    });
    return Response.json({ data: { id: event.id } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerLostFoundError
      ? failure(error.code, error.message, error.code === 'PARTNER_ADMIN_REQUIRED' ? 403 : 409)
      : failure('LOST_FOUND_EVENT_FAILED', 'The custody action could not be recorded.', 500);
  }
}
