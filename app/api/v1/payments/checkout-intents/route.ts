import { NextResponse } from 'next/server';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import { createHostedPaymentIntent } from '@/services/paymentGatewayService';
import { calculatePromotion } from '@/constants/promotionRules';
import { resolvePromotionRule } from '@/services/promotionService';
import { isCheckoutQuotePayable } from '@/lib/payments/gateway';

const KEY_PATTERN = /^payment-[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
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
  const existing = await prisma.paymentCheckoutIntent.findUnique({ where: { idempotencyKey } });
  if (existing) return NextResponse.json({ data: existing });
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
      const rule = await resolvePromotionRule(promotionCode, 'HOTEL');
      if (!rule || quote.totalAmount < rule.minimumSubtotal) {
        return NextResponse.json(
          { error: { code: 'PROMOTION_NOT_AVAILABLE', message: 'This offer is not available.' } },
          { status: 409 },
        );
      }
      amount = calculatePromotion(rule, quote.totalAmount).finalTotal;
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
    const created = await prisma.paymentCheckoutIntent.create({
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
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) {
      const concurrentIntent = await prisma.paymentCheckoutIntent.findUnique({
        where: { idempotencyKey },
      });
      if (concurrentIntent) return NextResponse.json({ data: concurrentIntent });
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
