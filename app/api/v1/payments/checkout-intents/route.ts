import { NextResponse } from 'next/server';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import { createHostedPaymentIntent } from '@/services/paymentGatewayService';
import { calculatePromotion } from '@/constants/promotionRules';
import { resolvePromotionRule } from '@/services/promotionService';
import { isCheckoutQuotePayable } from '@/lib/payments/gateway';
import {
  PromotionRedemptionError,
  reserveStoredPromotion,
} from '@/services/promotionRedemptionService';
import { publicCheckoutIntent } from '@/services/promotionRedemptionRules';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';

const KEY_PATTERN = /^payment-[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      {
        error: {
          code: 'FORBIDDEN_ORIGIN',
          message: 'Payment checkout must originate from the Mandyal Travels portal.',
        },
      },
      { status: 403 },
    );
  }
  if (!(await isPlatformFeatureEnabled('LIVE_MARKETPLACE_PAYMENTS'))) {
    return NextResponse.json(
      {
        error: {
          code: 'LIVE_PAYMENTS_NOT_APPROVED',
          message:
            'Online payment is not open yet. Mandyal Travels is completing payment-provider and tax readiness review.',
        },
      },
      { status: 503 },
    );
  }
  const body = await readJsonObject(request);
  const quoteId = typeof body?.quoteId === 'string' ? body.quoteId : '';
  const promotionCode = typeof body?.promotionCode === 'string' ? body.promotionCode : undefined;
  const idempotencyKey = request.headers.get('Idempotency-Key') ?? '';
  if (!quoteId || quoteId.length > 200 || !KEY_PATTERN.test(idempotencyKey))
    return NextResponse.json(
      {
        error: {
          code: 'PAYMENT_REQUEST_INVALID',
          message: 'A quote and valid payment retry key are required.',
        },
      },
      { status: 400 },
    );
  const existing = await prisma.paymentCheckoutIntent.findUnique({
    include: { promotionRedemption: { select: { code: true } } },
    where: { idempotencyKey },
  });
  const quote = await prisma.hotelQuote.findFirst({
    where: { id: quoteId, expiresAt: { gt: new Date() } },
    include: { availabilityLock: true, booking: { select: { id: true } } },
  });
  if (
    !quote ||
    !isCheckoutQuotePayable({
      bookingId: quote.booking?.id,
      lockExpiresAt: quote.availabilityLock.expiresAt,
      lockStatus: quote.availabilityLock.status,
      quoteExpiresAt: quote.expiresAt,
    })
  )
    return NextResponse.json(
      { error: { code: 'QUOTE_EXPIRED', message: 'Refresh the hotel price before payment.' } },
      { status: 409 },
    );
  try {
    let amount = quote.totalAmount;
    if (promotionCode) {
      const normalizedCode = promotionCode.trim().toUpperCase();
      if (existing?.promotionRedemption?.code === normalizedCode) {
        amount = existing.amount;
      } else {
        const rule = await resolvePromotionRule(promotionCode, 'HOTEL');
        if (!rule || quote.totalAmount < rule.minimumSubtotal) {
          return NextResponse.json(
            {
              error: { code: 'PROMOTION_NOT_AVAILABLE', message: 'This offer is not available.' },
            },
            { status: 409 },
          );
        }
        amount = calculatePromotion(rule, quote.totalAmount).finalTotal;
      }
    }
    if (existing) {
      const normalizedCode = promotionCode?.trim().toUpperCase();
      if (
        existing.quoteId !== quoteId ||
        existing.amount !== amount ||
        existing.currency !== quote.currency ||
        (existing.promotionRedemption && existing.promotionRedemption.code !== normalizedCode)
      ) {
        return NextResponse.json(
          {
            error: {
              code: 'PAYMENT_IDEMPOTENCY_CONTEXT_MISMATCH',
              message: 'This payment retry key belongs to different checkout details.',
            },
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ data: publicCheckoutIntent(existing) });
    }
    const provider = process.env.PAYMENT_PROVIDER_ID ?? 'configured-gateway';
    if (!/^[a-z0-9][a-z0-9_-]{0,49}$/.test(provider)) {
      throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
    }
    const origin = resolvePublicPortalOrigin();
    const intent = await createHostedPaymentIntent({
      amount,
      currency: quote.currency,
      idempotencyKey,
      reference: quote.id,
      returnUrl: `${origin}/hotels/${encodeURIComponent(quote.hotelSlug)}/booking/payment?paymentReturn=1`,
    });
    const created = await prisma.$transaction(async (transaction) => {
      const createdIntent = await transaction.paymentCheckoutIntent.create({
        data: {
          quoteId,
          idempotencyKey,
          provider,
          providerRef: intent.providerRef,
          amount,
          currency: quote.currency,
          checkoutUrl: intent.checkoutUrl,
          expiresAt: intent.expiresAt,
        },
      });
      const claim = await reserveStoredPromotion(transaction, {
        claimKey: `HOTEL_CHECKOUT:${idempotencyKey}`,
        code: promotionCode,
        currency: quote.currency,
        expiresAt: intent.expiresAt,
        productType: 'HOTEL',
        subtotal: quote.totalAmount,
      });
      if (claim) {
        if (claim.finalTotal !== amount) {
          throw new PromotionRedemptionError(
            'PROMOTION_TOTAL_MISMATCH',
            'The promotion total changed. Review the booking price again.',
          );
        }
        await transaction.promotionRedemption.update({
          data: { checkoutIntentId: createdIntent.id },
          where: { id: claim.id },
        });
      }
      return createdIntent;
    });
    return NextResponse.json({ data: publicCheckoutIntent(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof PromotionRedemptionError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 409 },
      );
    }
    if (hasPrismaErrorCode(error, 'P2002')) {
      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_REQUEST_IN_PROGRESS',
            message: 'This payment request is already being created. Retry it safely.',
          },
        },
        { status: 409 },
      );
    }
    const code = error instanceof Error ? error.message : '';
    return NextResponse.json(
      {
        error: {
          code,
          message:
            code === 'PAYMENT_PROVIDER_NOT_CONFIGURED' ||
            code === 'PUBLIC_APP_ORIGIN_NOT_CONFIGURED' ||
            code === 'PUBLIC_APP_ORIGIN_INVALID'
              ? 'Live payment checkout is not configured.'
              : 'Payment checkout is temporarily unavailable.',
        },
      },
      { status: 503 },
    );
  }
}
