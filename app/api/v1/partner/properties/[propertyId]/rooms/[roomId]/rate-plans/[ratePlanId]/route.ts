import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { PartnerOperationsError, partnerOperationsService } from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ propertyId: string; ratePlanId: string; roomId: string }> },
) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL') return failure('HOTEL_PARTNER_REQUIRED', 'An active hotel supplier account is required.', 403);
  if (access.memberRole !== 'ADMIN') return failure('PARTNER_ADMIN_REQUIRED', 'Only the supplier administrator can pause rate plans.', 403);
  try {
    const { propertyId, ratePlanId, roomId } = await context.params;
    const data = await partnerOperationsService.pauseRatePlan(access.partnerId, propertyId, roomId, ratePlanId);
    await recordPartnerAudit(access, { action: 'RATE_PLAN_PAUSED', entityId: data.id, entityType: 'RATE_PLAN', metadata: { propertyId, roomId }, summary: `${data.name} was paused without deleting its history.` });
    return Response.json({ data });
  } catch (error) {
    return error instanceof PartnerOperationsError ? failure(error.code, error.message, 409) : failure('RATE_PLAN_PAUSE_FAILED', 'The rate plan could not be paused.', 500);
  }
}
