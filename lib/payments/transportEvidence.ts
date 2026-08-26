import { createHmac, timingSafeEqual } from 'node:crypto';

import { DEMO_TRANSPORT_PAYMENT_EVIDENCE } from '../../constants/transportPayment.ts';
import type { CustomerTripProduct } from '../../services/customerTripPersistenceRules.ts';

export { DEMO_TRANSPORT_PAYMENT_EVIDENCE };

const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,49}$/;
const MAX_PROVIDER_REFERENCE_LENGTH = 200;
const MAX_EVIDENCE_LIFETIME_MS = 30 * 60 * 1000;
const MAX_CAPTURE_AGE_MS = 24 * 60 * 60 * 1000;

export interface TransportPaymentEvidenceClaims {
  amount: number;
  capturedAt: string;
  confirmationCode: string;
  currency: 'INR';
  expiresAt: string;
  productType: CustomerTripProduct;
  provider: string;
  providerRef: string;
  userId: string;
  version: 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseClaims(value: unknown, now: Date): TransportPaymentEvidenceClaims | null {
  if (!isRecord(value)) return null;
  const productType = value.productType;
  const capturedAt = typeof value.capturedAt === 'string' ? new Date(value.capturedAt) : null;
  const expiresAt = typeof value.expiresAt === 'string' ? new Date(value.expiresAt) : null;
  if (
    value.version !== 1 ||
    !Number.isSafeInteger(value.amount) ||
    (value.amount as number) < 0 ||
    value.currency !== 'INR' ||
    (productType !== 'FLIGHT' && productType !== 'BUS' && productType !== 'CAR') ||
    typeof value.confirmationCode !== 'string' ||
    value.confirmationCode.length < 3 ||
    value.confirmationCode.length > 80 ||
    typeof value.userId !== 'string' ||
    value.userId.length < 1 ||
    value.userId.length > 200 ||
    typeof value.provider !== 'string' ||
    !PROVIDER_PATTERN.test(value.provider) ||
    typeof value.providerRef !== 'string' ||
    value.providerRef.length < 1 ||
    value.providerRef.length > MAX_PROVIDER_REFERENCE_LENGTH ||
    !capturedAt ||
    Number.isNaN(capturedAt.valueOf()) ||
    !expiresAt ||
    Number.isNaN(expiresAt.valueOf()) ||
    capturedAt.getTime() > now.getTime() + 60_000 ||
    capturedAt.getTime() < now.getTime() - MAX_CAPTURE_AGE_MS ||
    expiresAt.getTime() <= now.getTime() ||
    expiresAt.getTime() - capturedAt.getTime() > MAX_EVIDENCE_LIFETIME_MS
  ) {
    return null;
  }
  return {
    amount: value.amount as number,
    capturedAt: capturedAt.toISOString(),
    confirmationCode: value.confirmationCode,
    currency: 'INR',
    expiresAt: expiresAt.toISOString(),
    productType,
    provider: value.provider,
    providerRef: value.providerRef,
    userId: value.userId,
    version: 1,
  };
}

export function createTransportPaymentEvidence(
  claims: TransportPaymentEvidenceClaims,
  secret: string,
): string {
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encodedClaims).digest('base64url');
  return `${encodedClaims}.${signature}`;
}

export function verifyTransportPaymentEvidence(
  evidence: string,
  secret: string,
  now = new Date(),
): TransportPaymentEvidenceClaims | null {
  const [encodedClaims, suppliedSignature, extra] = evidence.split('.');
  if (!encodedClaims || !suppliedSignature || extra) return null;
  const expectedSignature = createHmac('sha256', secret).update(encodedClaims).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedSignature, 'base64url');
  } catch {
    return null;
  }
  if (
    supplied.length !== expectedSignature.length ||
    !timingSafeEqual(supplied, expectedSignature)
  ) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8'));
    return parseClaims(parsed, now);
  } catch {
    return null;
  }
}

export function isDemoTransportCheckoutEnabled(environment: NodeJS.ProcessEnv = process.env) {
  return (
    environment.NODE_ENV !== 'production' && environment.ALLOW_DEMO_TRANSPORT_CHECKOUT === 'true'
  );
}
