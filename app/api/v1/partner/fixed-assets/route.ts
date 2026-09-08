import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  createPartnerFixedAsset,
  PartnerFixedAssetError,
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
      'Only a supplier administrator can register assets.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_FIXED_ASSET', 'Enter valid asset details.', 400);
  try {
    const asset = await createPartnerFixedAsset({
      actorUserId: access.userId,
      partnerId: access.partnerId,
      propertyId: String(body.propertyId ?? ''),
      values: body,
    });
    await recordPartnerAudit(access, {
      action: 'FIXED_ASSET_REGISTERED',
      entityId: asset.id,
      entityType: 'HOTEL_FIXED_ASSET',
      summary: `${asset.assetTag} fixed asset registered.`,
    });
    return Response.json({ data: { id: asset.id, version: asset.version } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerFixedAssetError
      ? failure(error.code, error.message, 409)
      : failure('FIXED_ASSET_FAILED', 'The fixed asset could not be registered.', 500);
  }
}
