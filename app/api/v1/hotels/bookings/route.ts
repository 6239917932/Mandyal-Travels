import { NextResponse } from 'next/server';

import {
  bookingAccessCookieOptions,
  getBookingAccessCookieName,
  legacyBookingAccessCookieName,
} from '@/lib/bookingAccess';
import { getCurrentUser } from '@/lib/auth/session';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import {
  BusinessCheckoutError,
  validateBusinessCheckout,
} from '@/services/businessCheckoutService';
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
    (request.businessTravelRequestId === undefined ||
      typeof request.businessTravelRequestId === 'string') &&
    typeof request.hotelSlug === 'string' &&
    (request.promotionCode === undefined || typeof request.promotionCode === 'string') &&
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

  const body = await readJsonObject(request);
  if (!body) {
    return errorResponse('INVALID_JSON', 'The request body must contain valid JSON.', 400);
  }

  if (!isCreateBookingRequest(body)) {
    return errorResponse('INVALID_BOOKING_REQUEST', 'Required booking fields are missing.', 400);
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
