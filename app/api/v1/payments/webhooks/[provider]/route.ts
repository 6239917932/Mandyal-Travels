import { NextResponse } from 'next/server';
import { readTextBody } from '@/lib/api/request';
import { paymentPayloadHash, verifyPaymentWebhook } from '@/lib/payments/gateway';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';

type Context = { params: Promise<{ provider: string }> };
type ProviderEvent = { id?: unknown; type?: unknown; paymentReference?: unknown };

const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,49}$/;

function isBoundedProviderValue(value: unknown, maximumLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximumLength &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

export async function POST(request: Request, context: Context) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || secret.length < 32)
    return NextResponse.json({ error: { code: 'WEBHOOK_NOT_CONFIGURED' } }, { status: 503 });
  const payload = await readTextBody(request);
  if (payload === null)
    return NextResponse.json({ error: { code: 'WEBHOOK_PAYLOAD_TOO_LARGE' } }, { status: 413 });
  const signature = request.headers.get('x-payment-signature') ?? '';
  const timestamp = request.headers.get('x-payment-timestamp') ?? '';
  if (!verifyPaymentWebhook({ payload, signature, timestamp, secret }))
    return NextResponse.json({ error: { code: 'WEBHOOK_SIGNATURE_INVALID' } }, { status: 401 });
  const { provider } = await context.params;
  if (!PROVIDER_PATTERN.test(provider))
    return NextResponse.json({ error: { code: 'WEBHOOK_PROVIDER_INVALID' } }, { status: 400 });
  let parsed: ProviderEvent;
  try {
    parsed = JSON.parse(payload) as ProviderEvent;
  } catch {
    return NextResponse.json({ error: { code: 'WEBHOOK_PAYLOAD_INVALID' } }, { status: 400 });
  }
  if (
    !isBoundedProviderValue(parsed.id, 200) ||
    !isBoundedProviderValue(parsed.type, 100) ||
    !isBoundedProviderValue(parsed.paymentReference, 200)
  )
    return NextResponse.json({ error: { code: 'WEBHOOK_PAYLOAD_INVALID' } }, { status: 400 });
  const eventId = parsed.id;
  const eventType = parsed.type;
  const paymentReference = parsed.paymentReference;
  const existing = await prisma.paymentProviderEvent.findUnique({
    where: { provider_providerEventId: { provider, providerEventId: eventId } },
  });
  if (existing) return NextResponse.json({ data: { accepted: true, duplicate: true } });
  const intentStatus =
    eventType === 'payment.captured'
      ? 'CAPTURED'
      : eventType === 'payment.failed'
        ? 'FAILED'
        : undefined;
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.paymentProviderEvent.create({
        data: {
          provider,
          providerEventId: eventId,
          eventType,
          providerRef: paymentReference,
          payloadHash: paymentPayloadHash(payload),
          status: intentStatus ? 'PROCESSED' : 'IGNORED',
          processedAt: new Date(),
        },
      });
      if (intentStatus)
        await transaction.paymentCheckoutIntent.updateMany({
          where: { providerRef: paymentReference },
          data: {
            status: intentStatus,
            capturedAt: intentStatus === 'CAPTURED' ? new Date() : null,
          },
        });
    });
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002'))
      return NextResponse.json({ data: { accepted: true, duplicate: true } });
    throw error;
  }
  return NextResponse.json({ data: { accepted: true, duplicate: false } }, { status: 202 });
}
