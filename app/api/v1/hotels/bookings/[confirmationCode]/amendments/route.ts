import type { NextRequest } from 'next/server';

import { getBookingAccessCookieName, legacyBookingAccessCookieName } from '@/lib/bookingAccess';
import { hotelBookingService, HotelBookingRuleError } from '@/services/hotelBookingService';
import type { ApiErrorResponse } from '@/types/commerce';

interface AmendmentRouteContext {
  params: Promise<{ confirmationCode: string }>;
}

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
}

export async function POST(
  request: NextRequest,
  context: AmendmentRouteContext,
): Promise<Response> {
  const { confirmationCode } = await context.params;
  const accessToken =
    request.cookies.get(getBookingAccessCookieName(confirmationCode))?.value ??
    request.cookies.get(legacyBookingAccessCookieName)?.value;
  if (!accessToken) {
    return errorResponse('BOOKING_ACCESS_TOKEN_REQUIRED', 'Booking access is required.', 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'The request body must contain valid JSON.', 400);
  }

  if (!body || typeof body !== 'object') {
    return errorResponse('INVALID_AMENDMENT_REQUEST', 'Amendment details are required.', 400);
  }
  const values = body as Record<string, unknown>;
  if (
    typeof values.reason !== 'string' ||
    typeof values.requestedCheckInDate !== 'string' ||
    typeof values.requestedCheckOutDate !== 'string' ||
    values.reason.trim().length < 3 ||
    values.reason.trim().length > 500
  ) {
    return errorResponse(
      'INVALID_AMENDMENT_REQUEST',
      'Valid requested dates and a short reason are required.',
      400,
    );
  }

  try {
    const booking = await hotelBookingService.requestAmendment(confirmationCode, accessToken, {
      reason: values.reason.trim(),
      requestedCheckInDate: values.requestedCheckInDate,
      requestedCheckOutDate: values.requestedCheckOutDate,
    });
    return booking
      ? Response.json({ data: booking }, { status: 201 })
      : errorResponse('BOOKING_NOT_FOUND', 'The booking could not be found.', 404);
  } catch (error) {
    if (error instanceof HotelBookingRuleError) {
      return errorResponse(error.code, error.message, 409);
    }
    return errorResponse('AMENDMENT_REQUEST_FAILED', 'The request could not be saved.', 500);
  }
}
