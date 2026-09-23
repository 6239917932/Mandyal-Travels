import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { RazorpayCheckout } from './RazorpayCheckout';

export const dynamic = 'force-dynamic';

export default async function RazorpayPaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!/^order_[A-Za-z0-9]{8,80}$/.test(orderId)) notFound();
  const intent = await prisma.paymentCheckoutIntent.findUnique({
    include: { quote: { select: { hotelSlug: true } } },
    where: { providerRef: orderId },
  });
  const onboarding = intent
    ? null
    : await prisma.partnerOnboardingOrder.findUnique({ where: { providerRef: orderId } });
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? '';
  const validIntent =
    intent?.provider === 'razorpay' && intent.status === 'CREATED' && intent.expiresAt > new Date();
  const validOnboarding =
    onboarding?.provider === 'razorpay' &&
    onboarding.status === 'CREATED' &&
    Boolean(onboarding.expiresAt && onboarding.expiresAt > new Date());
  if ((!validIntent && !validOnboarding) || !keyId) notFound();
  return (
    <RazorpayCheckout
      amount={intent?.amount ?? Math.floor((onboarding?.dueNowAmount ?? 0) / 100)}
      currency={intent?.currency ?? onboarding?.currency ?? 'INR'}
      keyId={keyId}
      orderId={orderId}
      returnUrl={
        intent
          ? `/hotels/${encodeURIComponent(intent.quote.hotelSlug)}/booking/payment?paymentReturn=1`
          : '/partners/apply?paymentReturn=1'
      }
    />
  );
}
