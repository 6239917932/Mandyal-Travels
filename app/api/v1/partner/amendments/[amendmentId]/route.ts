import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { HotelBookingRuleError, hotelBookingService } from '@/services/hotelBookingService';
import type { ApiErrorResponse } from '@/types/commerce';

interface ReviewContext {
  params: Promise<{ amendmentId: string }>;
}

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
}

export async function PATCH(request: Request, context: ReviewContext): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL') {
    return errorResponse('PARTNER_UNAUTHORIZED', 'Partner access is required.', 401);
  }
  const body = await readJsonObject(request);
  if (!body) {
    return errorResponse('INVALID_JSON', 'The request body must contain valid JSON.', 400);
  }
  const values = body;
  if (
    !['approved', 'declined'].includes(String(values.decision)) ||
    typeof values.reviewNote !== 'string' ||
    values.reviewNote.trim().length < 3 ||
    values.reviewNote.trim().length > 500
  ) {
    return errorResponse('INVALID_REVIEW', 'Choose a decision and enter a short review note.', 400);
  }
  const { amendmentId } = await context.params;
  try {
    const amendment = await hotelBookingService.reviewAmendment(
      amendmentId,
      values.decision as 'approved' | 'declined',
      values.reviewNote.trim(),
      access.allowedHotelSlugs,
    );
    if (amendment) {
      await recordPartnerAudit(access, {
        action: 'BOOKING_AMENDMENT_REVIEWED',
        entityId: amendmentId,
        entityType: 'BOOKING_AMENDMENT',
        metadata: { decision: values.decision },
        summary: `Hotel amendment ${values.decision}.`,
      });
    }
    return amendment
      ? Response.json({ data: amendment })
      : errorResponse('AMENDMENT_NOT_FOUND', 'The pending amendment was not found.', 404);
  } catch (error) {
    return error instanceof HotelBookingRuleError
      ? errorResponse(error.code, error.message, 409)
      : errorResponse('AMENDMENT_REVIEW_FAILED', 'The amendment could not be reviewed.', 500);
  }
}
