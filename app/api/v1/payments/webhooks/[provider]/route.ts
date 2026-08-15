import { NextResponse } from 'next/server';
import { paymentPayloadHash, verifyPaymentWebhook } from '@/lib/payments/gateway';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ provider: string }> };
type ProviderEvent = { id?: unknown; type?: unknown; paymentReference?: unknown };

export async function POST(request: Request, context: Context) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json({ error: { code: 'WEBHOOK_NOT_CONFIGURED' } }, { status: 503 });
  const payload = await request.text();
  const signature = request.headers.get('x-payment-signature') ?? '';
  const timestamp = request.headers.get('x-payment-timestamp') ?? '';
  if (!verifyPaymentWebhook({ payload, signature, timestamp, secret }))
    return NextResponse.json({ error: { code: 'WEBHOOK_SIGNATURE_INVALID' } }, { status: 401 });
  const { provider } = await context.params;
  let parsed: ProviderEvent;
  try {
    parsed = JSON.parse(payload) as ProviderEvent;
  } catch {
    return NextResponse.json({ error: { code: 'WEBHOOK_PAYLOAD_INVALID' } }, { status: 400 });
  }
  if (
    typeof parsed.id !== 'string' ||
    typeof parsed.type !== 'string' ||
    typeof parsed.paymentReference !== 'string'
  )
    return NextResponse.json({ error: { code: 'WEBHOOK_PAYLOAD_INVALID' } }, { status: 400 });
  const existing = await prisma.paymentProviderEvent.findUnique({
    where: { providerEventId: parsed.id },
  });
  if (existing) return NextResponse.json({ data: { accepted: true, duplicate: true } });
  const intentStatus =
    parsed.type === 'payment.captured'
      ? 'CAPTURED'
      : parsed.type === 'payment.failed'
        ? 'FAILED'
        : undefined;
  await prisma.$transaction(async (transaction) => {
    await transaction.paymentProviderEvent.create({
      data: {
        provider: provider.slice(0, 100),
        providerEventId: parsed.id as string,
        eventType: parsed.type as string,
        providerRef: parsed.paymentReference as string,
        payloadHash: paymentPayloadHash(payload),
        status: intentStatus ? 'PROCESSED' : 'IGNORED',
        processedAt: new Date(),
      },
    });
    if (intentStatus)
      await transaction.paymentCheckoutIntent.updateMany({
        where: { providerRef: parsed.paymentReference as string },
        data: { status: intentStatus, capturedAt: intentStatus === 'CAPTURED' ? new Date() : null },
      });
  });
  return NextResponse.json({ data: { accepted: true, duplicate: false } }, { status: 202 });
}
