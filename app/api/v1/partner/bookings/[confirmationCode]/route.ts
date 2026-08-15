import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

type StayStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW';

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ confirmationCode: string }> },
): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL') {
    return errorResponse('PARTNER_UNAUTHORIZED', 'Hotel partner access is required.', 401);
  }
  const body = await readJsonObject(request);
  const nextStatus = String(body?.status ?? '') as StayStatus;
  if (!['CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'].includes(nextStatus)) {
    return errorResponse('INVALID_STAY_STATUS', 'Choose a valid hotel stay status.', 400);
  }
  const { confirmationCode } = await context.params;
  try {
    const booking = await partnerOperationsService.updateHotelStayStatus(
      access.partnerId,
      confirmationCode,
      nextStatus,
      access.userId,
    );
    return Response.json({ data: { operationalStatus: booking.operationalStatus } });
  } catch (error) {
    if (error instanceof PartnerOperationsError) {
      return errorResponse(error.code, error.message, error.code === 'BOOKING_NOT_FOUND' ? 404 : 409);
    }
    return errorResponse('STAY_UPDATE_FAILED', 'The hotel stay status could not be updated.', 500);
  }
}
