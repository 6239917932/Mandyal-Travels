import { NextResponse } from 'next/server';

import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { prisma } from '@/lib/prisma';
import { reconcilePayuCheckout } from '@/services/payuPaymentReconciliationService';

type Context = { params: Promise<{ intentId: string }> };

export const runtime = 'nodejs';

export async function GET(request: Request, context: Context) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'same-site'].includes(fetchSite)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN_ORIGIN' } }, { status: 403 });
  }
  const rateLimit = await consumeRateLimit({
    action: 'PAYMENT_STATUS_READ',
    identifier: getRequestRateLimitIdentifier(request, 'public'),
    limit: 20,
    windowMs: 5 * 60 * 1_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED' } },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  }
  const { intentId } = await context.params;
  if (!/^[a-z0-9]{20,40}$/i.test(intentId)) {
    return NextResponse.json({ error: { code: 'PAYMENT_INTENT_INVALID' } }, { status: 400 });
  }
  let intent = await prisma.paymentCheckoutIntent.findUnique({
    select: { expiresAt: true, id: true, provider: true, providerRef: true, status: true },
    where: { id: intentId },
  });
  if (!intent) {
    return NextResponse.json({ error: { code: 'PAYMENT_INTENT_NOT_FOUND' } }, { status: 404 });
  }
  if (intent.provider === 'payu' && intent.status === 'CREATED') {
    try {
      await reconcilePayuCheckout(intent.providerRef);
      intent = await prisma.paymentCheckoutIntent.findUnique({
        select: { expiresAt: true, id: true, provider: true, providerRef: true, status: true },
        where: { id: intentId },
      });
    } catch {
      // A pending PayU callback remains CREATED and is retried by the bounded client poll.
    }
  }
  if (!intent) {
    return NextResponse.json({ error: { code: 'PAYMENT_INTENT_NOT_FOUND' } }, { status: 404 });
  }
  const response = NextResponse.json({
    data: { expiresAt: intent.expiresAt.toISOString(), id: intent.id, status: intent.status },
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
