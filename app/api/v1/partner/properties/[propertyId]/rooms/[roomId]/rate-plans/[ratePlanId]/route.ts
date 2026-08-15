import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ propertyId: string; ratePlanId: string; roomId: string }> },
) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL')
    return failure('HOTEL_PARTNER_REQUIRED', 'An active hotel supplier account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only the supplier administrator can manage rate plans.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter a valid rate-plan action.', 400);
  try {
    const { propertyId, ratePlanId, roomId } = await context.params;
    const action = String(body.action ?? '');
    const data =
      action === 'PAUSE'
        ? await partnerOperationsService.pauseRatePlan(
            access.partnerId,
            propertyId,
            roomId,
            ratePlanId,
          )
        : action === 'RESTORE'
          ? await partnerOperationsService.restoreRatePlan(
              access.partnerId,
              propertyId,
              roomId,
              ratePlanId,
            )
          : action === 'UPDATE'
            ? await partnerOperationsService.updateRatePlan(
                access.partnerId,
                propertyId,
                roomId,
                ratePlanId,
                {
                  cancellationDescription: String(body.cancellationDescription ?? ''),
                  freeCancellationHours: Number(body.freeCancellationHours),
                  maximumStayNights: Number(body.maximumStayNights),
                  mealPlan: String(body.mealPlan ?? ''),
                  minimumStayNights: Number(body.minimumStayNights),
                  name: String(body.name ?? ''),
                  nightlyRate: Number(body.nightlyRate),
                  refundable: body.refundable === true,
                  taxesAndFees: Number(body.taxesAndFees),
                },
              )
            : null;
    if (!data) return failure('INVALID_RATE_PLAN_ACTION', 'Choose update, pause, or restore.', 400);
    const auditVerb =
      action === 'UPDATE' ? 'UPDATED' : action === 'RESTORE' ? 'RESTORED' : 'PAUSED';
    await recordPartnerAudit(access, {
      action: `RATE_PLAN_${auditVerb}`,
      entityId: data.id,
      entityType: 'RATE_PLAN',
      metadata: { propertyId, roomId },
      summary: `${data.name} was ${auditVerb.toLowerCase()} with its history retained.`,
    });
    return Response.json({ data });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('RATE_PLAN_UPDATE_FAILED', 'The rate plan could not be updated.', 500);
  }
}
