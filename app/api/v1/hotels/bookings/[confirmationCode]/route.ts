import type { NextRequest } from 'next/server';

import { getBookingAccessCookieName, legacyBookingAccessCookieName } from '@/lib/bookingAccess';
import { hotelBookingService } from '@/services/hotelBookingService';
import type { ApiErrorResponse } from '@/types/commerce';

interface BookingRouteContext {
  params: Promise<{ confirmationCode: string }>;
}

function getAccessToken(request: NextRequest, confirmationCode: string): string | undefined {
  const authorization = request.headers.get('Authorization');
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  return (
    bearerToken ??
    request.cookies.get(getBookingAccessCookieName(confirmationCode))?.value ??
    request.cookies.get(legacyBookingAccessCookieName)?.value
  );
}

export async function GET(request: NextRequest, context: BookingRouteContext): Promise<Response> {
  const { confirmationCode } = await context.params;
  const accessToken = getAccessToken(request, confirmationCode);

  if (!accessToken) {
    const body: ApiErrorResponse = {
      error: {
        code: 'BOOKING_ACCESS_TOKEN_REQUIRED',
        message: 'A booking access token is required.',
      },
    };
    return Response.json(body, { status: 401 });
  }

  const booking = await hotelBookingService.getManagedBooking(confirmationCode, accessToken);

  if (!booking) {
    const body: ApiErrorResponse = {
      error: {
        code: 'BOOKING_NOT_FOUND',
        message: 'The booking reference or access token is invalid.',
      },
    };
    return Response.json(body, { status: 404 });
  }

  return Response.json({ data: booking });
}

export async function DELETE(
  request: NextRequest,
  context: BookingRouteContext,
): Promise<Response> {
  const { confirmationCode } = await context.params;
  const accessToken = getAccessToken(request, confirmationCode);
  if (!accessToken) {
    return Response.json(
      {
        error: {
          code: 'BOOKING_ACCESS_TOKEN_REQUIRED',
          message: 'A booking access token is required.',
        },
      } satisfies ApiErrorResponse,
      { status: 401 },
    );
  }

  const booking = await hotelBookingService.cancelBooking(confirmationCode, accessToken);
  if (!booking) {
    return Response.json(
      {
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: 'The booking reference or access token is invalid.',
        },
      } satisfies ApiErrorResponse,
      { status: 404 },
    );
  }

  return Response.json({ data: booking });
}
