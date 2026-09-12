import { PARTNER_COMMERCIAL_POLICY, PMS_ROOM_TIERS } from '../finance/partnerCommercialPolicy.ts';

export const PARTNER_ONBOARDING_PRICE = Object.freeze({
  currency: 'INR',
  halfPriceMonths: PARTNER_COMMERCIAL_POLICY.halfPriceMonths,
  monthlySubscriptionAmount: PMS_ROOM_TIERS[0].monthlyAmountPaise,
  oneTimeSetupAmount: PARTNER_COMMERCIAL_POLICY.standardRemoteSetupAmountPaise,
  trialMonths: PARTNER_COMMERCIAL_POLICY.trialMonths,
  version: PARTNER_COMMERCIAL_POLICY.version,
});

export type PartnerOnboardingQuote = Readonly<{
  couponCode: string;
  currency: 'INR';
  discountAmount: number;
  dueNow: number;
  monthlySubscriptionAmount: number;
  oneTimeSetupAmount: number;
  priceVersion: string;
  waived: boolean;
}>;

export function quotePartnerOnboarding(input?: {
  couponCode?: string;
  approvedWaiverCodes?: ReadonlySet<string>;
}): PartnerOnboardingQuote {
  const couponCode = input?.couponCode?.trim().toUpperCase().slice(0, 40) ?? '';
  const subtotal = PARTNER_ONBOARDING_PRICE.oneTimeSetupAmount;
  const couponWaived = Boolean(couponCode && input?.approvedWaiverCodes?.has(couponCode));
  const waived = subtotal === 0 || couponWaived;
  return {
    couponCode,
    currency: 'INR',
    discountAmount: couponWaived ? subtotal : 0,
    dueNow: waived ? 0 : subtotal,
    monthlySubscriptionAmount: PARTNER_ONBOARDING_PRICE.monthlySubscriptionAmount,
    oneTimeSetupAmount: PARTNER_ONBOARDING_PRICE.oneTimeSetupAmount,
    priceVersion: PARTNER_ONBOARDING_PRICE.version,
    waived,
  };
}

export function onboardingCanAdvance(input: {
  agreementAccepted: boolean;
  paymentStatus: string;
  phoneOtpVerified: boolean;
}) {
  return (
    input.agreementAccepted &&
    input.phoneOtpVerified &&
    (input.paymentStatus === 'CAPTURED' ||
      input.paymentStatus === 'PAID' ||
      input.paymentStatus === 'WAIVED')
  );
}
