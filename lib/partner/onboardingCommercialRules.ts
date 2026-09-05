export const PARTNER_ONBOARDING_PRICE = Object.freeze({
  currency: 'INR',
  monthlySubscriptionAmount: 99_900,
  oneTimeSetupAmount: 2_500_000,
  version: 'supplier-onboarding-inr-v1',
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
  const subtotal =
    PARTNER_ONBOARDING_PRICE.oneTimeSetupAmount +
    PARTNER_ONBOARDING_PRICE.monthlySubscriptionAmount;
  const waived = Boolean(couponCode && input?.approvedWaiverCodes?.has(couponCode));
  return {
    couponCode,
    currency: 'INR',
    discountAmount: waived ? subtotal : 0,
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
    (input.paymentStatus === 'PAID' || input.paymentStatus === 'WAIVED')
  );
}
