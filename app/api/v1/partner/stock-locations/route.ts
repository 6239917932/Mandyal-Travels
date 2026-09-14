import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  createPartnerStockLocation,
  PartnerStockInventoryError,
} from '@/services/partnerStockInventoryService';

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
      'Only a supplier administrator can create stock locations.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_STOCK_LOCATION', 'Enter valid stock location details.', 400);
  try {
    const location = await createPartnerStockLocation({
      actorUserId: access.userId,
      partnerId: access.partnerId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: 'STOCK_LOCATION_CREATED',
      entityId: location.id,
      entityType: 'HOTEL_STOCK_LOCATION',
      summary: `${location.code} stock location created.`,
    });
    return Response.json({ data: { id: location.id, version: location.version } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerStockInventoryError
      ? failure(error.code, error.message, 409)
      : failure('STOCK_LOCATION_FAILED', 'The stock location could not be created.', 500);
  }
}
