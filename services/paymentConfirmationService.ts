import 'server-only';

import { prisma } from '@/lib/prisma';

export interface ConfirmedPaymentContext {
  capturedAt?: Date;
  checkoutIntentId?: string;
  environment: 'LIVE' | 'SANDBOX';
  provider: string;
  providerRef: string;
  reconciliationStatus: 'MATCHED' | 'UNRECONCILED';
}

export class PaymentConfirmationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentConfirmationError';
  }
}

export async function confirmPaymentForBooking(input: {
  amount: number;
  bookingId: string;
  currency: string;
  paymentIntentId?: string;
  quoteId: string;
}): Promise<ConfirmedPaymentContext> {
  const liveMode =
    process.env.NODE_ENV === 'production' || process.env.PAYMENT_GATEWAY_MODE === 'live';

  if (!input.paymentIntentId) {
    if (liveMode) {
      throw new PaymentConfirmationError(
        'PAYMENT_CONFIRMATION_REQUIRED',
        'Complete the secure hosted payment before confirming this booking.',
      );
    }
    return {
      environment: 'SANDBOX',
      provider: 'sandbox-simulator',
      providerRef: `sandbox-${input.bookingId}`,
      reconciliationStatus: 'UNRECONCILED',
    };
  }

  const intent = await prisma.paymentCheckoutIntent.findUnique({
    include: { payment: { select: { id: true } } },
    where: { id: input.paymentIntentId },
  });
  if (!intent || intent.quoteId !== input.quoteId) {
    throw new PaymentConfirmationError(
      'PAYMENT_INTENT_NOT_FOUND',
      'The payment confirmation does not belong to this booking quote.',
    );
  }
  if (intent.payment) {
    throw new PaymentConfirmationError(
      'PAYMENT_INTENT_ALREADY_USED',
      'This payment confirmation has already been used for another booking.',
    );
  }
  if (intent.status !== 'CAPTURED' || !intent.capturedAt) {
    throw new PaymentConfirmationError(
      'PAYMENT_NOT_CAPTURED',
      'The payment provider has not confirmed the payment yet.',
    );
  }
  if (intent.capturedAt.getTime() > intent.expiresAt.getTime()) {
    throw new PaymentConfirmationError(
      'PAYMENT_INTENT_EXPIRED',
      'The payment was captured after the checkout authorization expired.',
    );
  }
  if (intent.amount !== input.amount || intent.currency !== input.currency) {
    throw new PaymentConfirmationError(
      'PAYMENT_AMOUNT_MISMATCH',
      'The captured payment does not match the server-calculated booking total.',
    );
  }

  return {
    capturedAt: intent.capturedAt,
    checkoutIntentId: intent.id,
    environment: liveMode ? 'LIVE' : 'SANDBOX',
    provider: intent.provider,
    providerRef: intent.providerRef,
    reconciliationStatus: 'MATCHED',
  };
}
