import { NextResponse } from 'next/server';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import { createHostedPaymentIntent } from '@/services/paymentGatewayService';

const KEY_PATTERN = /^payment-[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  const quoteId = typeof body?.quoteId === 'string' ? body.quoteId : '';
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
  });
  if (!quote)
    return NextResponse.json(
      { error: { code: 'QUOTE_EXPIRED', message: 'Refresh the hotel price before payment.' } },
      { status: 409 },
    );
  try {
    const origin = resolvePublicPortalOrigin();
    const intent = await createHostedPaymentIntent({
      amount: quote.totalAmount,
      currency: quote.currency,
      idempotencyKey,
      reference: quote.id,
      returnUrl: `${origin}/hotels/${encodeURIComponent(quote.hotelSlug)}/booking/payment?paymentReturn=1`,
    });
    const created = await prisma.paymentCheckoutIntent.create({
      data: {
        quoteId,
        idempotencyKey,
        provider: 'configured-gateway',
        providerRef: intent.providerRef,
        amount: quote.totalAmount,
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
