import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  BusinessCheckoutError,
  validateBusinessCheckout,
} from '@/services/businessCheckoutService';
import type { PromotionProduct } from '@/constants/promotionRules';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

const PRODUCT_TYPES = new Set<PromotionProduct>(['FLIGHT', 'BUS', 'CAR']);

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isProductType(value: string): value is PromotionProduct {
  return PRODUCT_TYPES.has(value as PromotionProduct);
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return errorResponse('AUTH_REQUIRED', 'Sign in to save this trip.', 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse('INVALID_JSON', 'The request body is invalid.', 400);
  }

  const productType = isText(body.productType) ? body.productType.toUpperCase() : '';
  const confirmationCode = isText(body.confirmationCode) ? body.confirmationCode.trim() : '';
  const title = isText(body.title) ? body.title.trim() : '';
  const subtitle = isText(body.subtitle) ? body.subtitle.trim() : '';
  const startDate = isText(body.startDate) ? body.startDate.trim() : '';
  const endDate = body.endDate == null ? null : isText(body.endDate) ? body.endDate.trim() : '';
  const totalAmount = body.totalAmount;
  const businessTravelRequestId = isText(body.businessTravelRequestId)
    ? body.businessTravelRequestId.trim()
    : undefined;

  if (
    !isProductType(productType) ||
    !confirmationCode ||
    !title ||
    !subtitle ||
    !startDate ||
    endDate === '' ||
    !Number.isInteger(totalAmount) ||
    (totalAmount as number) < 0
  ) {
    return errorResponse('INVALID_TRIP', 'The trip details are incomplete.', 400);
  }

  let businessCheckout: Awaited<ReturnType<typeof validateBusinessCheckout>> | undefined;
  if (businessTravelRequestId) {
    try {
      businessCheckout = await validateBusinessCheckout({
        productType,
        promotionCode: isText(body.promotionCode) ? body.promotionCode : undefined,
        requestId: businessTravelRequestId,
        selection: body.businessSelection,
        userId: user.id,
      });
    } catch (error) {
      if (error instanceof BusinessCheckoutError) {
        return errorResponse(error.code, error.message, error.status);
      }
      console.error('Business checkout validation failed.', error);
      return errorResponse(
        'BUSINESS_CHECKOUT_FAILED',
        'The company approval could not be checked. No payment has been captured.',
        500,
      );
    }

    if (businessCheckout.finalTotal !== totalAmount) {
      return errorResponse(
        'BUSINESS_TOTAL_MISMATCH',
        'The company booking total changed. Please review the fare again.',
        409,
      );
    }
  }

  const tripData = {
    currency: 'INR',
    detailsJson: JSON.stringify(body.details ?? {}),
    email: user.email,
    endDate,
    productType,
    startDate,
    status: 'CONFIRMED',
    subtitle,
    title,
    totalAmount: totalAmount as number,
    userId: user.id,
  };

  try {
    const existingTrip = await prisma.customerTrip.findUnique({ where: { confirmationCode } });
    if (
      existingTrip &&
      existingTrip.userId !== user.id &&
      existingTrip.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      return errorResponse(
        'CONFIRMATION_ALREADY_USED',
        'This booking reference is already connected to another account.',
        409,
      );
    }

    if (!businessCheckout) {
      const trip = existingTrip
        ? await prisma.customerTrip.update({ data: tripData, where: { id: existingTrip.id } })
        : await prisma.customerTrip.create({
            data: { confirmationCode, ...tripData },
          });
      return NextResponse.json({ data: trip }, { status: 201 });
    }

    if (
      existingTrip?.businessTravelRequestId &&
      existingTrip.businessTravelRequestId !== businessCheckout.requestId
    ) {
      return errorResponse(
        'BUSINESS_REQUEST_ALREADY_USED',
        'This booking reference is already connected to another company request.',
        409,
      );
    }

    const trip = await prisma.$transaction(async (transaction) => {
      const completed = await transaction.businessTravelRequest.updateMany({
        data: {
          bookedAt: new Date(),
          bookingTotalAmount: totalAmount as number,
          status: 'BOOKED',
        },
        where: { id: businessCheckout.requestId, requesterId: user.id, status: 'APPROVED' },
      });
      if (completed.count !== 1) {
        throw new BusinessCheckoutError(
          'BUSINESS_REQUEST_ALREADY_USED',
          'This company request is no longer available for booking.',
        );
      }

      const data = { ...tripData, businessTravelRequestId: businessCheckout.requestId };
      const completedTrip = await (existingTrip
        ? transaction.customerTrip.update({ data, where: { id: existingTrip.id } })
        : transaction.customerTrip.create({ data: { confirmationCode, ...data } }));
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: BUSINESS_AUDIT_ACTIONS.TRAVEL_BOOKED,
          actorUserId: user.id,
          entityId: businessCheckout.requestId,
          entityType: 'TRAVEL_REQUEST',
          metadata: { confirmationCode, productType, totalAmount: totalAmount as number },
          organizationId: businessCheckout.organizationId,
          summary: `${productType.toLowerCase()} company travel booked.`,
        }),
      });
      return completedTrip;
    });

    return NextResponse.json({ data: trip }, { status: 201 });
  } catch (error) {
    if (error instanceof BusinessCheckoutError) {
      return errorResponse(error.code, error.message, error.status);
    }
    console.error('Trip history creation failed.', error);
    return errorResponse('TRIP_SAVE_FAILED', 'The booking could not be completed.', 500);
  }
}
