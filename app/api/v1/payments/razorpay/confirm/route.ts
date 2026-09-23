import { NextResponse } from 'next/server';

import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { verifyRazorpayCheckoutSignature } from '@/lib/payments/razorpay';
import { prisma } from '@/lib/prisma';
import { fetchRazorpayPayment } from '@/services/paymentGatewayService';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN_ORIGIN' } }, { status: 403 });
  }
  const rateLimit = await consumeRateLimit({
    action: 'PAYMENT_CHECKOUT_CREATE',
    identifier: getRequestRateLimitIdentifier(request, 'public'),
    limit: 12,
    windowMs: 15 * 60 * 1_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 });
  }
  const body = await readJsonObject(request);
  const orderId = typeof body?.razorpay_order_id === 'string' ? body.razorpay_order_id : '';
  const paymentId = typeof body?.razorpay_payment_id === 'string' ? body.razorpay_payment_id : '';
  const signature = typeof body?.razorpay_signature === 'string' ? body.razorpay_signature : '';
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? '';
  if (!secret || !verifyRazorpayCheckoutSignature({ orderId, paymentId, signature, secret })) {
    return NextResponse.json({ error: { code: 'PAYMENT_SIGNATURE_INVALID' } }, { status: 401 });
  }
  const intent = await prisma.paymentCheckoutIntent.findUnique({ where: { providerRef: orderId } });
  const payment = await fetchRazorpayPayment(paymentId);
  const onboarding = intent
    ? null
    : await prisma.partnerOnboardingOrder.findUnique({ where: { providerRef: orderId } });
  if (
    (!intent || intent.provider !== 'razorpay') &&
    (!onboarding || onboarding.provider !== 'razorpay')
  ) {
    return NextResponse.json({ error: { code: 'PAYMENT_INTENT_NOT_FOUND' } }, { status: 404 });
  }
  const expectedAmount = intent ? intent.amount * 100 : onboarding?.dueNowAmount;
  const expectedCurrency = intent?.currency ?? onboarding?.currency;
  const valid =
    payment.order_id === orderId &&
    payment.status === 'captured' &&
    payment.amount === expectedAmount &&
    payment.currency === expectedCurrency;
  if (!valid) {
    return NextResponse.json({ error: { code: 'PAYMENT_NOT_CAPTURED' } }, { status: 409 });
  }
  if (intent) {
    await prisma.paymentCheckoutIntent.updateMany({
      data: { capturedAt: new Date(), capturedProviderRef: paymentId, status: 'CAPTURED' },
      where: { id: intent.id, status: 'CREATED' },
    });
  } else if (onboarding) {
    await prisma.partnerOnboardingOrder.updateMany({
      data: { capturedAt: new Date(), status: 'CAPTURED' },
      where: { id: onboarding.id, status: 'CREATED' },
    });
  }
  return NextResponse.json({
    data: { intentId: intent?.id ?? onboarding?.id, status: 'CAPTURED' },
  });
}
