export const PARTNER_COMMERCIAL_POLICY = Object.freeze({
  annualBillingMonths: 10,
  currency: 'INR',
  effectiveFrom: '2026-09-13',
  feeGstBasisPoints: 1_800,
  halfPriceMonths: 6,
  standardRemoteSetupAmountPaise: 0,
  trialMonths: 6,
  version: 'IN-PARTNER-COMMERCIAL-2026-09-13-v1',
});

export const PMS_ROOM_TIERS = Object.freeze([
  { code: 'ROOMS_1_10', maximumRooms: 10, monthlyAmountPaise: 199_900 },
  { code: 'ROOMS_11_20', maximumRooms: 20, monthlyAmountPaise: 299_900 },
  { code: 'ROOMS_21_35', maximumRooms: 35, monthlyAmountPaise: 449_900 },
  { code: 'ROOMS_36_50', maximumRooms: 50, monthlyAmountPaise: 599_900 },
  { code: 'ROOMS_51_100', maximumRooms: 100, monthlyAmountPaise: 899_900 },
] as const);

export type BookingCommercialSource =
  'MANDYAL_MARKETPLACE' | 'PMS_DIRECT_ONLINE' | 'PMS_DIRECT_OFFLINE' | 'EXTERNAL_OTA';

export const BOOKING_FEE_RULES = Object.freeze({
  EXTERNAL_OTA: { basisPoints: 0, minimumFeeRupees: 0 },
  MANDYAL_MARKETPLACE: { basisPoints: 1_800, minimumFeeRupees: 199 },
  PMS_DIRECT_OFFLINE: { basisPoints: 300, minimumFeeRupees: 49 },
  PMS_DIRECT_ONLINE: { basisPoints: 600, minimumFeeRupees: 99 },
} satisfies Record<BookingCommercialSource, { basisPoints: number; minimumFeeRupees: number }>);

export function pmsRoomTier(roomCount: number) {
  if (!Number.isInteger(roomCount) || roomCount < 1)
    throw new Error('Room count must be a positive whole number.');
  return PMS_ROOM_TIERS.find((tier) => roomCount <= tier.maximumRooms) ?? null;
}

export function quotePmsSubscription(input: {
  billingMonths?: 1 | 12;
  monthsSinceActivation: number;
  roomCount: number;
}) {
  if (!Number.isInteger(input.monthsSinceActivation) || input.monthsSinceActivation < 0)
    throw new Error('Months since activation must be a non-negative whole number.');
  const tier = pmsRoomTier(input.roomCount);
  if (!tier) {
    return {
      amountPaise: null,
      billingMonths: input.billingMonths ?? 1,
      phase: 'CUSTOM' as const,
      policyVersion: PARTNER_COMMERCIAL_POLICY.version,
      tierCode: 'ROOMS_101_PLUS',
    };
  }
  const billingMonths = input.billingMonths ?? 1;
  const phase =
    input.monthsSinceActivation < PARTNER_COMMERCIAL_POLICY.trialMonths
      ? 'FREE_TRIAL'
      : input.monthsSinceActivation <
          PARTNER_COMMERCIAL_POLICY.trialMonths + PARTNER_COMMERCIAL_POLICY.halfPriceMonths
        ? 'HALF_PRICE'
        : 'STANDARD';
  const monthlyAmountPaise =
    phase === 'FREE_TRIAL'
      ? 0
      : phase === 'HALF_PRICE'
        ? Math.round(tier.monthlyAmountPaise / 2)
        : tier.monthlyAmountPaise;
  if (billingMonths === 12 && phase !== 'STANDARD')
    throw new Error('Annual billing is available from the standard-rate period.');
  const chargeableMonths = billingMonths === 12 ? PARTNER_COMMERCIAL_POLICY.annualBillingMonths : 1;
  return {
    amountPaise: monthlyAmountPaise * chargeableMonths,
    billingMonths,
    monthlyAmountPaise,
    phase,
    policyVersion: PARTNER_COMMERCIAL_POLICY.version,
    tierCode: tier.code,
  };
}

export function calculatePartnerBookingFee(input: {
  bookingValueRupees: number;
  source: BookingCommercialSource;
}) {
  if (!Number.isSafeInteger(input.bookingValueRupees) || input.bookingValueRupees < 1)
    throw new Error('Booking value must be a positive whole-rupee amount.');
  const rule = BOOKING_FEE_RULES[input.source];
  const percentageFee = Math.round((input.bookingValueRupees * rule.basisPoints) / 10_000);
  const grossFeeRupees =
    rule.basisPoints === 0 ? 0 : Math.max(percentageFee, rule.minimumFeeRupees);
  const taxableFeeRupees = Math.round(
    (grossFeeRupees * 10_000) / (10_000 + PARTNER_COMMERCIAL_POLICY.feeGstBasisPoints),
  );
  return {
    basisPoints: rule.basisPoints,
    feeGstRupees: grossFeeRupees - taxableFeeRupees,
    grossFeeRupees,
    minimumFeeRupees: rule.minimumFeeRupees,
    policyVersion: PARTNER_COMMERCIAL_POLICY.version,
    source: input.source,
    taxableFeeRupees,
  } as const;
}
