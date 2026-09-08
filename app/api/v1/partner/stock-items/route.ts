import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  createPartnerStockItem,
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
      'Only a supplier administrator can create stock items.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_STOCK_ITEM', 'Enter valid stock item details.', 400);
  try {
    const item = await createPartnerStockItem({
      actorUserId: access.userId,
      partnerId: access.partnerId,
      propertyId: String(body.propertyId ?? ''),
      values: body,
    });
    await recordPartnerAudit(access, {
      action: 'STOCK_ITEM_CREATED',
      entityId: item.id,
      entityType: 'HOTEL_STOCK_ITEM',
      summary: `${item.sku} stock control created.`,
    });
    return Response.json({ data: { id: item.id, version: item.version } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerStockInventoryError
      ? failure(error.code, error.message, 409)
      : failure('STOCK_ITEM_FAILED', 'The stock item could not be created.', 500);
  }
}
