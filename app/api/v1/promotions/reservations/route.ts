import { NextResponse } from 'next/server';

import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  BusinessCheckoutError,
  revalidateTravelSelection,
  validateBusinessCheckout,
} from '@/services/businessCheckoutService';
import {
  isCustomerTripProduct,
  normalizeCustomerTripReference,
} from '@/services/customerTripPersistenceRules';
import {
  PromotionRedemptionError,
  reserveStoredPromotion,
} from '@/services/promotionRedemptionService';

const RESERVATION_WINDOW_MS = 15 * 60 * 1000;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return errorResponse('INVALID_ORIGIN', 'Invalid request origin.', 403);
  }
  const user = await getCurrentUser();
  if (!user) return errorResponse('AUTH_REQUIRED', 'Sign in before reserving this offer.', 401);

  const body = await readJsonObject(request);
  const productType = typeof body?.productType === 'string' ? body.productType.toUpperCase() : '';
  const promotionCode =
    typeof body?.promotionCode === 'string' ? body.promotionCode.trim().toUpperCase() : '';
  const reference = normalizeCustomerTripReference(
    typeof body?.confirmationCode === 'string' ? body.confirmationCode : '',
  );
  const businessTravelRequestId =
    typeof body?.businessTravelRequestId === 'string'
      ? body.businessTravelRequestId.trim()
      : undefined;
  if (
    !isCustomerTripProduct(productType) ||
    !reference ||
    reference.productType !== productType ||
    !promotionCode ||
    promotionCode.length > 64 ||
    (businessTravelRequestId !== undefined && businessTravelRequestId.length > 200)
  ) {
    return errorResponse(
      'PROMOTION_RESERVATION_INVALID',
      'Choose a valid booking and promotion before continuing to payment.',
      400,
    );
  }

  try {
    const limit = await consumeRateLimit({
      action: 'TRANSPORT_PROMOTION_RESERVE',
      identifier: getRequestRateLimitIdentifier(request, user.id),
      limit: 10,
      windowMs: RESERVATION_WINDOW_MS,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: 'PROMOTION_RESERVATION_RATE_LIMITED',
            message: 'Too many promotion reservations. Wait before trying again.',
          },
        },
        { headers: { 'Retry-After': String(limit.retryAfterSeconds) }, status: 429 },
      );
    }

    const checkout = businessTravelRequestId
      ? await validateBusinessCheckout({
          productType,
          promotionCode,
          requestId: businessTravelRequestId,
          selection: body?.businessSelection,
          userId: user.id,
        })
      : await revalidateTravelSelection(productType, body?.businessSelection, promotionCode);
    const expiresAt = new Date(Date.now() + RESERVATION_WINDOW_MS);
    const claimKey = `TRANSPORT_CHECKOUT:${reference.confirmationCode}`;
    const claim = await prisma.$transaction((transaction) =>
      reserveStoredPromotion(transaction, {
        claimKey,
        code: promotionCode,
        currency: 'INR',
        expiresAt,
        productType,
        subtotal: checkout.subtotal,
        userId: user.id,
      }),
    );
    if (!claim) {
      return errorResponse(
        'PROMOTION_RESERVATION_UNAVAILABLE',
        'This promotion cannot be reserved safely for payment. Continue without it or contact support.',
        409,
      );
    }
    if (claim.finalTotal !== checkout.finalTotal) {
      throw new PromotionRedemptionError(
        'PROMOTION_TOTAL_MISMATCH',
        'The promotion total changed. Review the booking price again.',
      );
    }
    return NextResponse.json(
      {
        data: {
          discountAmount: claim.discountAmount,
          expiresAt: claim.expiresAt.toISOString(),
          finalTotal: claim.finalTotal,
          reservationToken: claim.claimKey,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BusinessCheckoutError) {
      return errorResponse(error.code, error.message, error.status);
    }
    if (error instanceof PromotionRedemptionError) {
      return errorResponse(error.code, error.message, 409);
    }
    console.error('Transport promotion reservation failed.', error);
    return errorResponse(
      'PROMOTION_RESERVATION_FAILED',
      'The promotion could not be reserved safely. No payment has been captured.',
      500,
    );
  }
}
