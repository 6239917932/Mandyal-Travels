import { NextResponse } from 'next/server';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { createHostedPaymentIntent } from '@/services/paymentGatewayService';

const KEY_PATTERN = /^payment-[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  const quoteId = typeof body?.quoteId === 'string' ? body.quoteId : '';
  const idempotencyKey = request.headers.get('Idempotency-Key') ?? '';
  if (!quoteId || !KEY_PATTERN.test(idempotencyKey))
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
    const origin = new URL(request.url).origin;
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
    const code = error instanceof Error ? error.message : '';
    return NextResponse.json(
      {
        error: {
          code,
          message:
            code === 'PAYMENT_PROVIDER_NOT_CONFIGURED'
              ? 'Live payment checkout is not configured.'
              : 'Payment checkout is temporarily unavailable.',
        },
      },
      { status: 503 },
    );
  }
}
