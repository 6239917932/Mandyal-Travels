import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  changePartnerRestaurantEntityStatus,
  createPartnerRestaurantMenuItem,
  createPartnerRestaurantOutlet,
  createPartnerRestaurantTable,
  PartnerRestaurantCatalogError,
} from '@/services/partnerRestaurantCatalogService';

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
      'Only a supplier administrator can manage restaurant configuration.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_RESTAURANT_ACTION', 'Enter valid restaurant details.', 400);
  const action = String(body.action ?? '')
    .trim()
    .toUpperCase();
  const shared = {
    actorUserId: access.userId,
    idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
    partnerId: access.partnerId,
    values: body,
  };
  try {
    const result =
      action === 'CREATE_OUTLET'
        ? await createPartnerRestaurantOutlet(shared)
        : action === 'CREATE_TABLE'
          ? await createPartnerRestaurantTable(shared)
          : action === 'CREATE_MENU_ITEM'
            ? await createPartnerRestaurantMenuItem(shared)
            : action === 'CHANGE_STATUS'
              ? await changePartnerRestaurantEntityStatus(shared)
              : null;
    if (!result)
      return failure('INVALID_RESTAURANT_ACTION', 'Choose a supported restaurant action.', 400);
    await recordPartnerAudit(access, {
      action: `HOTEL_RESTAURANT_${action}`,
      entityId: 'entityId' in result ? result.entityId : result.id,
      entityType: 'HOTEL_RESTAURANT_CATALOG',
      summary: `Restaurant ${action.toLowerCase().replaceAll('_', ' ')} recorded.`,
    });
    return Response.json(
      { data: { id: 'entityId' in result ? result.entityId : result.id } },
      { status: 201 },
    );
  } catch (error) {
    return error instanceof PartnerRestaurantCatalogError
      ? failure(error.code, error.message, 409)
      : failure(
          'RESTAURANT_CATALOG_FAILED',
          'The restaurant configuration could not be changed.',
          500,
        );
  }
}
