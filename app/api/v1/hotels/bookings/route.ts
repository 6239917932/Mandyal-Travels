import { NextResponse } from 'next/server';

import {
  bookingAccessCookieOptions,
  getBookingAccessCookieName,
  legacyBookingAccessCookieName,
} from '@/lib/bookingAccess';
import { hotelBookingService, HotelBookingRuleError } from '@/services/hotelBookingService';
import type { ApiErrorResponse, CreateHotelBookingRequest } from '@/types/commerce';

function isCreateBookingRequest(value: unknown): value is CreateHotelBookingRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const request = value as Record<string, unknown>;
  const guest = request.guest;

  return (
    typeof request.availabilityLockId === 'string' &&
    typeof request.hotelSlug === 'string' &&
    typeof request.quoteId === 'string' &&
    Boolean(guest) &&
    typeof guest === 'object' &&
    typeof (guest as Record<string, unknown>).email === 'string' &&
    typeof (guest as Record<string, unknown>).firstName === 'string' &&
    typeof (guest as Record<string, unknown>).lastName === 'string' &&
    typeof (guest as Record<string, unknown>).phone === 'string'
  );
}

function errorResponse(code: string, message: string, status: number): Response {
  const body: ApiErrorResponse = { error: { code, message } };
  return Response.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  const idempotencyKey = request.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return errorResponse('IDEMPOTENCY_KEY_REQUIRED', 'An Idempotency-Key header is required.', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'The request body must contain valid JSON.', 400);
  }

  if (!isCreateBookingRequest(body)) {
    return errorResponse('INVALID_BOOKING_REQUEST', 'Required booking fields are missing.', 400);
  }

  try {
    const createdBooking = await hotelBookingService.confirmBooking(body, idempotencyKey);
    const response = NextResponse.json({ data: createdBooking.booking }, { status: 201 });
    response.cookies.set(
      getBookingAccessCookieName(createdBooking.booking.confirmationCode),
      createdBooking.accessToken,
      bookingAccessCookieOptions,
    );
    response.cookies.set(
      legacyBookingAccessCookieName,
      createdBooking.accessToken,
      bookingAccessCookieOptions,
    );
    return response;
  } catch (error) {
    if (error instanceof HotelBookingRuleError) {
      return errorResponse(error.code, error.message, 409);
    }

    return errorResponse('BOOKING_CREATION_FAILED', 'The booking could not be confirmed.', 500);
  }
}
