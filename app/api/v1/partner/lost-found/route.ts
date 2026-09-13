import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  createPartnerLostFoundItem,
  PartnerLostFoundError,
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
  if (!body) return failure('INVALID_LOST_FOUND_ITEM', 'Enter valid custody details.', 400);
  try {
    const item = await createPartnerLostFoundItem({
      actorUserId: access.userId,
      partnerId: access.partnerId,
      propertyId: String(body.propertyId ?? ''),
      values: body,
    });
    await recordPartnerAudit(access, {
      action: 'LOST_FOUND_ITEM_REGISTERED',
      entityId: item.id,
      entityType: 'HOTEL_LOST_FOUND_ITEM',
      summary: `${item.referenceCode} received into lost-and-found custody.`,
    });
    return Response.json({ data: { id: item.id, version: item.version } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerLostFoundError
      ? failure(error.code, error.message, 409)
      : failure('LOST_FOUND_CREATE_FAILED', 'The custody item could not be registered.', 500);
  }
}
