import type { NextRequest } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { readJsonObject } from '@/lib/api/request';
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
  const user = await getCurrentUser();
  if (!accessToken && !user) {
    return errorResponse(
      'BOOKING_ACCESS_REQUIRED',
      'Sign in to the booking account or use the browser where it was booked.',
      401,
    );
  }

  const body = await readJsonObject(request);
  if (!body) {
    return errorResponse('INVALID_JSON', 'The request body must contain valid JSON.', 400);
  }
  const values = body;
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
    const amendmentRequest = {
      reason: values.reason.trim(),
      requestedCheckInDate: values.requestedCheckInDate,
      requestedCheckOutDate: values.requestedCheckOutDate,
    };
    let booking = accessToken
      ? await hotelBookingService.requestAmendment(confirmationCode, accessToken, amendmentRequest)
      : undefined;
    if (!booking && user) {
      booking = await hotelBookingService.requestAmendmentForGuest(
        confirmationCode,
        user.email,
        amendmentRequest,
      );
    }
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
