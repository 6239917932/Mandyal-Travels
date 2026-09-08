import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerFixedAssetError,
  recordPartnerFixedAssetEvent,
} from '@/services/partnerFixedAssetService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL')
    return failure('HOTEL_PARTNER_REQUIRED', 'A hotel partner account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only a supplier administrator can update asset custody.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_FIXED_ASSET_EVENT', 'Enter valid asset action details.', 400);
  try {
    const event = await recordPartnerFixedAssetEvent({
      actorUserId: access.userId,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      partnerId: access.partnerId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: `FIXED_ASSET_${event.eventType}`,
      entityId: event.assetId,
      entityType: 'HOTEL_FIXED_ASSET',
      summary: `${event.eventType.toLowerCase()} fixed-asset evidence recorded.`,
    });
    return Response.json({ data: { id: event.id } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerFixedAssetError
      ? failure(error.code, error.message, 409)
      : failure('FIXED_ASSET_EVENT_FAILED', 'The asset action could not be recorded.', 500);
  }
}
