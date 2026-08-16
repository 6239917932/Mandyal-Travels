import { NextResponse } from 'next/server';

import {
  bookingAccessCookieOptions,
  getBookingAccessCookieName,
  legacyBookingAccessCookieName,
} from '@/lib/bookingAccess';
import { getCurrentUser } from '@/lib/auth/session';
import { readJsonObject } from '@/lib/api/request';
import { isValidEmail, isValidName, normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import {
  BusinessCheckoutError,
  validateBusinessCheckout,
} from '@/services/businessCheckoutService';
import { hotelBookingService, HotelBookingRuleError } from '@/services/hotelBookingService';
import type { ApiErrorResponse, CreateHotelBookingRequest } from '@/types/commerce';

const IDEMPOTENCY_KEY_PATTERN =
  /^hotel-booking-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isCreateBookingRequest(value: unknown): value is CreateHotelBookingRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const request = value as Record<string, unknown>;
  const guest = request.guest as Record<string, unknown> | undefined;

  return (
    typeof request.availabilityLockId === 'string' &&
    request.availabilityLockId.length > 0 &&
    request.availabilityLockId.length <= 200 &&
    (request.businessTravelRequestId === undefined ||
      typeof request.businessTravelRequestId === 'string') &&
    typeof request.hotelSlug === 'string' &&
    request.hotelSlug.length > 0 &&
    request.hotelSlug.length <= 120 &&
    (request.paymentIntentId === undefined ||
      (typeof request.paymentIntentId === 'string' &&
        request.paymentIntentId.length > 0 &&
        request.paymentIntentId.length <= 200)) &&
    (request.promotionCode === undefined ||
      (typeof request.promotionCode === 'string' && request.promotionCode.length <= 50)) &&
    typeof request.quoteId === 'string' &&
    request.quoteId.length > 0 &&
    request.quoteId.length <= 200 &&
    Boolean(guest) &&
    isValidEmail(normalizeEmail(typeof guest?.email === 'string' ? guest.email : '')) &&
    isValidName(typeof guest?.firstName === 'string' ? guest.firstName : '') &&
    isValidName(typeof guest?.lastName === 'string' ? guest.lastName : '') &&
    typeof guest?.phone === 'string' &&
    guest.phone.trim().length >= 7 &&
    guest.phone.trim().length <= 32 &&
    typeof guest?.specialRequests === 'string' &&
    guest.specialRequests.length <= 1000
  );
}

function errorResponse(code: string, message: string, status: number): Response {
  const body: ApiErrorResponse = { error: { code, message } };
  return Response.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  const idempotencyKey = request.headers.get('Idempotency-Key');
  if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return errorResponse('IDEMPOTENCY_KEY_INVALID', 'A valid booking retry key is required.', 400);
  }

  const body = await readJsonObject(request);
  if (!body) {
    return errorResponse('INVALID_JSON', 'The request body must contain valid JSON.', 400);
  }

  if (!isCreateBookingRequest(body)) {
    return errorResponse('INVALID_BOOKING_REQUEST', 'Required booking fields are missing.', 400);
  }

  let existingBusinessRequestId: string | null | undefined;
  try {
    const existingContext = await prisma.booking.findUnique({
      select: { businessTravelRequestId: true },
      where: { idempotencyKey },
    });
    existingBusinessRequestId = existingContext?.businessTravelRequestId;
  } catch (error) {
    console.error('Hotel booking retry lookup failed.', error);
    return errorResponse('BOOKING_LOOKUP_FAILED', 'The booking retry could not be checked.', 500);
  }
  if (
    existingBusinessRequestId !== undefined &&
    existingBusinessRequestId !== (body.businessTravelRequestId ?? null)
  ) {
    return errorResponse(
      'IDEMPOTENCY_CONTEXT_MISMATCH',
      'This booking retry key is connected to a different booking context.',
      409,
    );
  }

  let businessCheckout: Awaited<ReturnType<typeof validateBusinessCheckout>> | undefined;
  let businessRequesterId: string | undefined;
  let completedBusinessRetry = false;
  if (body.businessTravelRequestId) {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse(
        'AUTH_REQUIRED',
        'Sign in before completing an organization booking.',
        401,
      );
    }
    businessRequesterId = user.id;
    const existingBooking = await prisma.booking.findFirst({
      select: { id: true },
      where: {
        businessTravelRequest: {
          id: body.businessTravelRequestId,
          requesterId: user.id,
          status: 'BOOKED',
        },
        idempotencyKey,
      },
    });
    completedBusinessRetry = Boolean(existingBooking);

    if (!completedBusinessRetry) {
      try {
        businessCheckout = await validateBusinessCheckout({
          productType: 'HOTEL',
          promotionCode: body.promotionCode,
          requestId: body.businessTravelRequestId,
          selection: { quoteId: body.quoteId },
          userId: user.id,
        });
      } catch (error) {
        if (error instanceof BusinessCheckoutError) {
          return errorResponse(error.code, error.message, error.status);
        }
        console.error('Hotel business checkout validation failed.', error);
        return errorResponse(
          'BUSINESS_CHECKOUT_FAILED',
          'The company approval could not be checked. No payment has been captured.',
          500,
        );
      }
    }
  }

  try {
    const createdBooking = await hotelBookingService.confirmBooking(
      body,
      idempotencyKey,
      businessCheckout && businessRequesterId && !completedBusinessRetry
        ? {
            expectedTotal: businessCheckout.finalTotal,
            requestId: businessCheckout.requestId,
            requesterId: businessRequesterId,
          }
        : undefined,
    );
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
    if (error instanceof BusinessCheckoutError) {
      return errorResponse(error.code, error.message, error.status);
    }
    if (error instanceof HotelBookingRuleError) {
      return errorResponse(error.code, error.message, 409);
    }

    return errorResponse('BOOKING_CREATION_FAILED', 'The booking could not be confirmed.', 500);
  }
}
