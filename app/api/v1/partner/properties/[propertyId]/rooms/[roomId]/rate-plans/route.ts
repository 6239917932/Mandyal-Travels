import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function POST(
  request: Request,
  context: { params: Promise<{ propertyId: string; roomId: string }> },
) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL')
    return failure('HOTEL_PARTNER_REQUIRED', 'An active hotel supplier account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only the supplier administrator can add rate plans.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid rate plan details.', 400);
  try {
    const { propertyId, roomId } = await context.params;
    const data = await partnerOperationsService.createRatePlan(
      access.partnerId,
      propertyId,
      roomId,
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
    );
    await recordPartnerAudit(access, {
      action: 'RATE_PLAN_CREATED',
      entityId: data.id,
      entityType: 'RATE_PLAN',
      metadata: { propertyId, roomId },
      summary: `${data.name} added with a nightly rate of INR ${data.nightlyRate}.`,
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('RATE_PLAN_CREATE_FAILED', 'The rate plan could not be added.', 500);
  }
}
