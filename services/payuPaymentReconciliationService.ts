import 'server-only';

import { paymentPayloadHash } from '@/lib/payments/gateway';
import { isPayuTransactionId } from '@/lib/payments/payu';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { verifyPayuTransaction } from '@/services/paymentGatewayService';

export type PayuReconciliationResult = Readonly<{
  hotelSlug: string;
  intentId: string;
  state: 'CAPTURED' | 'FAILED' | 'PENDING' | 'REJECTED';
}>;

export async function getPayuCheckoutContext(transactionId: string) {
  if (!isPayuTransactionId(transactionId)) return null;
  const intent = await prisma.paymentCheckoutIntent.findUnique({
    include: { quote: { select: { hotelSlug: true } } },
    where: { providerRef: transactionId },
  });
  return intent?.provider === 'payu' ? intent : null;
}

export async function reconcilePayuCheckout(
  transactionId: string,
): Promise<PayuReconciliationResult | null> {
  const intent = await getPayuCheckoutContext(transactionId);
  if (!intent) return null;
  if (intent.status === 'CAPTURED' || intent.status === 'FAILED') {
    return { hotelSlug: intent.quote.hotelSlug, intentId: intent.id, state: intent.status };
  }

  const verified = await verifyPayuTransaction(transactionId);
  const amountMatches = verified.amount === intent.amount && intent.currency === 'INR';
  const state = !amountMatches
    ? 'REJECTED'
    : verified.captured
      ? 'CAPTURED'
      : verified.failed
        ? 'FAILED'
        : 'PENDING';
  const evidence = JSON.stringify({
    amount: verified.amount,
    payuPaymentId: verified.payuPaymentId,
    state,
    status: verified.status,
    transactionId,
  });
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.paymentProviderEvent.create({
        data: {
          errorMessage: amountMatches ? '' : 'PayU amount or INR currency does not match intent.',
          eventType: `payment.${state.toLowerCase()}`,
          payloadHash: paymentPayloadHash(evidence),
          processedAt: new Date(),
          provider: 'payu',
          providerEventId: `verify-${paymentPayloadHash(evidence)}`,
          providerRef: transactionId,
          status: state === 'REJECTED' ? 'REJECTED' : 'PROCESSED',
        },
      });
      if (state === 'CAPTURED' || state === 'FAILED') {
        await transaction.paymentCheckoutIntent.updateMany({
          data: {
            capturedAt: state === 'CAPTURED' ? new Date() : null,
            status: state,
          },
          where: { id: intent.id, status: 'CREATED' },
        });
      }
    });
  } catch (error) {
    if (!hasPrismaErrorCode(error, 'P2002')) throw error;
  }
  return { hotelSlug: intent.quote.hotelSlug, intentId: intent.id, state };
}
