import 'server-only';

import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import {
  PARTNER_ONBOARDING_PRICE,
  quotePartnerOnboarding,
} from '@/lib/partner/onboardingCommercialRules';
import { paymentPayloadHash } from '@/lib/payments/gateway';
import { isPayuTransactionId } from '@/lib/payments/payu';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { createHostedPaymentIntent, verifyPayuTransaction } from '@/services/paymentGatewayService';

export class PartnerEnrollmentError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function hashEvidence(value: string) {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32)
    throw new PartnerEnrollmentError(
      'SECURITY_NOT_CONFIGURED',
      'Secure acceptance evidence is not configured.',
    );
  return createHash('sha256').update(`${secret}:${value}`, 'utf8').digest('hex');
}

export async function createPartnerOnboardingCheckout(input: {
  couponCode?: string;
  idempotencyKey: string;
  returnUrl: string;
  userId: string;
}) {
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(input.idempotencyKey))
    throw new PartnerEnrollmentError('INVALID_IDEMPOTENCY_KEY', 'Use a valid payment retry key.');
  const existing = await prisma.partnerOnboardingOrder.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    if (existing.userId !== input.userId)
      throw new PartnerEnrollmentError(
        'CHECKOUT_CONTEXT_MISMATCH',
        'This checkout key belongs to another account.',
      );
    return existing;
  }
  const code = input.couponCode?.trim().toUpperCase().slice(0, 40) ?? '';
  const now = new Date();
  const coupon = code ? await prisma.partnerOnboardingCoupon.findUnique({ where: { code } }) : null;
  if (
    code &&
    (!coupon ||
      !coupon.active ||
      coupon.startsAt > now ||
      coupon.endsAt <= now ||
      (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit))
  )
    throw new PartnerEnrollmentError(
      'COUPON_UNAVAILABLE',
      'This onboarding coupon is invalid, expired, or fully used.',
    );
  if (coupon) {
    const existingCouponOrder = await prisma.partnerOnboardingOrder.findFirst({
      orderBy: { createdAt: 'desc' },
      where: {
        couponId: coupon.id,
        status: { not: 'FAILED' },
        userId: input.userId,
      },
    });
    if (existingCouponOrder) return existingCouponOrder;
  }
  const quote = quotePartnerOnboarding({
    approvedWaiverCodes: coupon?.waiverPercent === 100 ? new Set([coupon.code]) : new Set(),
    couponCode: code,
  });
  const provider = quote.dueNow === 0 ? '' : (process.env.PAYMENT_PROVIDER_ID ?? '');
  if (quote.dueNow > 0 && provider !== 'payu') {
    throw new PartnerEnrollmentError(
      'PAYMENT_PROVIDER_NOT_READY',
      'PayU supplier enrollment is not configured yet.',
    );
  }
  const hosted =
    quote.dueNow > 0
      ? await createHostedPaymentIntent({
          amount: quote.dueNow / 100,
          callbackPath: '/api/v1/partners/onboarding/payu/return',
          currency: quote.currency,
          description: 'Mandyal Travels supplier software onboarding',
          idempotencyKey: input.idempotencyKey,
          reference: `supplier-onboarding:${input.userId}`,
          returnUrl: input.returnUrl,
        })
      : null;
  try {
    return await prisma.$transaction(async (transaction) => {
      if (coupon) {
        const claimed = await transaction.partnerOnboardingCoupon.updateMany({
          data: { usageCount: { increment: 1 } },
          where: {
            active: true,
            endsAt: { gt: now },
            id: coupon.id,
            startsAt: { lte: now },
            ...(coupon.usageLimit === null ? {} : { usageCount: { lt: coupon.usageLimit } }),
          },
        });
        if (claimed.count !== 1)
          throw new PartnerEnrollmentError(
            'COUPON_UNAVAILABLE',
            'This onboarding coupon was just fully used.',
          );
      }
      return transaction.partnerOnboardingOrder.create({
        data: {
          checkoutUrl: hosted?.checkoutUrl ?? '',
          couponCodeSnapshot: quote.couponCode,
          couponId: coupon?.id,
          currency: quote.currency,
          discountAmount: quote.discountAmount,
          dueNowAmount: quote.dueNow,
          expiresAt: hosted?.expiresAt,
          idempotencyKey: input.idempotencyKey,
          monthlySubscriptionAmount: quote.monthlySubscriptionAmount,
          oneTimeSetupAmount: quote.oneTimeSetupAmount,
          priceVersion: quote.priceVersion,
          provider,
          providerRef: hosted?.providerRef,
          status: quote.waived ? 'WAIVED' : 'CREATED',
          subtotalAmount:
            PARTNER_ONBOARDING_PRICE.oneTimeSetupAmount +
            PARTNER_ONBOARDING_PRICE.monthlySubscriptionAmount,
          userId: input.userId,
        },
      });
    });
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002'))
      throw new PartnerEnrollmentError(
        'CHECKOUT_IN_PROGRESS',
        'This onboarding checkout is already being created.',
      );
    throw error;
  }
}

export async function reconcilePartnerOnboardingPayment(transactionId: string) {
  if (!isPayuTransactionId(transactionId)) return null;
  const order = await prisma.partnerOnboardingOrder.findUnique({
    where: { providerRef: transactionId },
  });
  if (!order || order.provider !== 'payu') return null;
  if (order.status === 'CAPTURED' || order.status === 'FAILED') return order;
  const verified = await verifyPayuTransaction(transactionId);
  const amountMatches = verified.amount * 100 === order.dueNowAmount && order.currency === 'INR';
  const status = !amountMatches
    ? 'REJECTED'
    : verified.captured
      ? 'CAPTURED'
      : verified.failed
        ? 'FAILED'
        : 'CREATED';
  const evidence = JSON.stringify({
    amount: verified.amount,
    payuPaymentId: verified.payuPaymentId,
    status,
    transactionId,
  });
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.paymentProviderEvent.create({
        data: {
          errorMessage: amountMatches
            ? ''
            : 'PayU amount or INR currency does not match supplier order.',
          eventType: `partner-onboarding.${status.toLowerCase()}`,
          payloadHash: paymentPayloadHash(evidence),
          processedAt: new Date(),
          provider: 'payu',
          providerEventId: `partner-verify-${paymentPayloadHash(evidence)}`,
          providerRef: transactionId,
          status: status === 'REJECTED' ? 'REJECTED' : 'PROCESSED',
        },
      });
      if (status === 'CAPTURED' || status === 'FAILED') {
        await transaction.partnerOnboardingOrder.updateMany({
          data: { capturedAt: status === 'CAPTURED' ? new Date() : null, status },
          where: { id: order.id, status: 'CREATED' },
        });
      }
    });
  } catch (error) {
    if (!hasPrismaErrorCode(error, 'P2002')) throw error;
  }
  return prisma.partnerOnboardingOrder.findUnique({ where: { id: order.id } });
}

export async function acceptPartnerAgreement(input: {
  acceptedName: string;
  agreementVersion: string;
  ipAddress: string;
  phoneVerificationRef: string;
  userAgent: string;
  userId: string;
}) {
  const agreement = await prisma.partnerAgreementVersion.findUnique({
    where: { version: input.agreementVersion },
  });
  if (
    !agreement ||
    agreement.status !== 'APPROVED' ||
    !agreement.effectiveAt ||
    agreement.effectiveAt > new Date()
  )
    throw new PartnerEnrollmentError(
      'AGREEMENT_UNAVAILABLE',
      'The approved supplier agreement is not available.',
    );
  const verification = await prisma.partnerPhoneVerification.findUnique({
    where: { providerRef: input.phoneVerificationRef },
  });
  if (
    !verification ||
    verification.userId !== input.userId ||
    verification.status !== 'VERIFIED' ||
    !verification.verifiedAt ||
    verification.expiresAt <= new Date()
  )
    throw new PartnerEnrollmentError(
      'PHONE_VERIFICATION_REQUIRED',
      'Complete a current phone OTP verification before accepting the agreement.',
    );
  const acceptedName = input.acceptedName.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (acceptedName.length < 3)
    throw new PartnerEnrollmentError(
      'ACCEPTED_NAME_REQUIRED',
      'Enter the authorized signatory name.',
    );
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.partnerOnboardingOrder.findFirst({
      orderBy: { createdAt: 'desc' },
      where: {
        agreementAcceptanceId: null,
        status: { in: ['CAPTURED', 'WAIVED'] },
        userId: input.userId,
      },
    });
    if (!order)
      throw new PartnerEnrollmentError(
        'ONBOARDING_PAYMENT_REQUIRED',
        'Complete or waive the supplier onboarding payment before accepting the agreement.',
      );
    const acceptance = await transaction.partnerAgreementAcceptance.upsert({
      create: {
        acceptedName,
        agreementVersionId: agreement.id,
        contentHash: agreement.contentHash,
        ipHash: hashEvidence(input.ipAddress),
        phoneVerificationId: verification.id,
        userAgentHash: hashEvidence(input.userAgent),
        userId: input.userId,
      },
      update: {},
      where: {
        userId_agreementVersionId: {
          agreementVersionId: agreement.id,
          userId: input.userId,
        },
      },
    });
    await transaction.partnerOnboardingOrder.update({
      data: { agreementAcceptanceId: acceptance.id, completedAt: new Date() },
      where: { id: order.id },
    });
    return acceptance;
  });
}

export async function assertPartnerEnrollmentComplete(userId: string) {
  const order = await prisma.partnerOnboardingOrder.findFirst({
    include: {
      agreementAcceptance: {
        include: { agreementVersion: true, phoneVerification: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    where: { status: { in: ['CAPTURED', 'WAIVED'] }, userId },
  });
  const acceptance = order?.agreementAcceptance;
  const verification = acceptance?.phoneVerification;
  const agreement = acceptance?.agreementVersion;
  if (
    !order?.completedAt ||
    !acceptance ||
    acceptance.contentHash !== agreement?.contentHash ||
    agreement.status !== 'APPROVED' ||
    !agreement.effectiveAt ||
    agreement.effectiveAt > new Date() ||
    verification?.status !== 'VERIFIED' ||
    !verification.verifiedAt ||
    verification.expiresAt <= new Date()
  ) {
    throw new PartnerEnrollmentError(
      'ONBOARDING_INCOMPLETE',
      'Complete payment, current phone verification, and the approved supplier agreement first.',
    );
  }
  return order;
}
