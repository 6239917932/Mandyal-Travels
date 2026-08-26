import 'server-only';

import {
  DEMO_TRANSPORT_PAYMENT_EVIDENCE,
  isDemoTransportCheckoutEnabled,
  verifyTransportPaymentEvidence,
} from '@/lib/payments/transportEvidence';
import type { CustomerTripProduct } from '@/services/customerTripPersistenceRules';

export interface ConfirmedTransportPayment {
  environment: 'DEMO' | 'LIVE';
  provider: string;
}

export class TransportPaymentEvidenceError extends Error {
  constructor(
    readonly code:
      | 'PAYMENT_CONFIRMATION_INVALID'
      | 'PAYMENT_CONFIRMATION_REQUIRED'
      | 'PAYMENT_CONFIRMATION_MISMATCH'
      | 'PAYMENT_EVIDENCE_NOT_CONFIGURED',
    message: string,
  ) {
    super(message);
    this.name = 'TransportPaymentEvidenceError';
  }
}

function configuredEvidenceSecret() {
  const secret = process.env.TRANSPORT_PAYMENT_EVIDENCE_SECRET?.trim();
  if (!secret || secret.length < 32 || /change-me|example|replace|your-/i.test(secret)) return null;
  return secret;
}

export function confirmTransportPayment(input: {
  amount: number;
  confirmationCode: string;
  evidence: unknown;
  productType: CustomerTripProduct;
  userId: string;
}): ConfirmedTransportPayment {
  if (input.evidence === DEMO_TRANSPORT_PAYMENT_EVIDENCE) {
    if (!isDemoTransportCheckoutEnabled()) {
      throw new TransportPaymentEvidenceError(
        'PAYMENT_CONFIRMATION_REQUIRED',
        'Complete secure payment before confirming this booking.',
      );
    }
    return { environment: 'DEMO', provider: 'explicit-demo-checkout' };
  }
  if (typeof input.evidence !== 'string' || input.evidence.length > 4_000) {
    throw new TransportPaymentEvidenceError(
      'PAYMENT_CONFIRMATION_REQUIRED',
      'Complete secure payment before confirming this booking.',
    );
  }
  const secret = configuredEvidenceSecret();
  if (!secret) {
    throw new TransportPaymentEvidenceError(
      'PAYMENT_EVIDENCE_NOT_CONFIGURED',
      'Secure transport payment confirmation is not configured.',
    );
  }
  const claims = verifyTransportPaymentEvidence(input.evidence, secret);
  if (!claims) {
    throw new TransportPaymentEvidenceError(
      'PAYMENT_CONFIRMATION_INVALID',
      'The payment confirmation is invalid or expired.',
    );
  }
  if (
    claims.amount !== input.amount ||
    claims.confirmationCode !== input.confirmationCode ||
    claims.productType !== input.productType ||
    claims.userId !== input.userId
  ) {
    throw new TransportPaymentEvidenceError(
      'PAYMENT_CONFIRMATION_MISMATCH',
      'The captured payment does not match this booking.',
    );
  }
  return { environment: 'LIVE', provider: claims.provider };
}
