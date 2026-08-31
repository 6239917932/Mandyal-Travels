export const MARKETPLACE_TAX_RULE = {
  commissionBasisPoints: 2_000,
  commissionGstBasisPoints: 1_800,
  effectiveFrom: '2026-08-31',
  gatewayFeeBasisPoints: 195,
  gatewayFeeGstBasisPoints: 1_800,
  gstTcsBasisPoints: 50,
  hotelGstThreshold: 7_500,
  incomeTaxTdsBasisPoints: 10,
  sourceUrls: [
    'https://cbic-gst.gov.in/gst-goods-services-rates.html',
    'https://cbic-gst.gov.in/pdf/01072020-CGST-Rules-2017-Part-A-Rules.pdf',
    'https://incometaxindia.gov.in/Pages/acts/income-tax-act.aspx',
  ],
  version: 'IN-MARKETPLACE-2026-08-31-v1',
} as const;

export type MarketplaceTaxProfile = {
  gstRegistrationStatus: 'REGISTERED' | 'UNREGISTERED';
  section194OExempt: boolean;
  section9FiveApplicable: boolean;
};

export type MarketplaceHotelTaxBreakdown = {
  commissionGstAmount: number;
  commissionGrossAmount: number;
  commissionTaxableAmount: number;
  customerTaxableAmount: number;
  customerTotalAmount: number;
  ecoGstLiabilityAmount: number;
  gatewayFeeAmount: number;
  gatewayFeeGstAmount: number;
  gstTcsAmount: number;
  hotelGstAmount: number;
  hotelGstBasisPoints: 1_200 | 1_800;
  incomeTaxTdsAmount: number;
  platformContributionAmount: number;
  ruleVersion: string;
  vendorBaseAmount: number;
  vendorGrossAmount: number;
  vendorSettlementAmount: number;
};

function assertAmount(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive whole-rupee amount.`);
  }
}

function roundedBasisPoints(amount: number, basisPoints: number) {
  return Math.round((amount * basisPoints) / 10_000);
}

export function grossUpVendorBase(
  vendorBaseAmount: number,
  commissionBasisPoints = MARKETPLACE_TAX_RULE.commissionBasisPoints,
) {
  assertAmount(vendorBaseAmount, 'Vendor base amount');
  if (
    !Number.isInteger(commissionBasisPoints) ||
    commissionBasisPoints < 1 ||
    commissionBasisPoints >= 10_000
  ) {
    throw new Error('Commission basis points must be between 1 and 9,999.');
  }
  return Math.ceil((vendorBaseAmount * 10_000) / (10_000 - commissionBasisPoints));
}

export function hotelGstBasisPoints(customerTaxableNightlyAmount: number): 1_200 | 1_800 {
  assertAmount(customerTaxableNightlyAmount, 'Customer taxable nightly amount');
  return customerTaxableNightlyAmount <= MARKETPLACE_TAX_RULE.hotelGstThreshold ? 1_200 : 1_800;
}

export function calculateMarketplaceHotelTax(input: {
  profile: MarketplaceTaxProfile;
  vendorBaseAmount: number;
  vendorNightlyBaseAmount: number;
}): MarketplaceHotelTaxBreakdown {
  assertAmount(input.vendorBaseAmount, 'Vendor base amount');
  assertAmount(input.vendorNightlyBaseAmount, 'Vendor nightly base amount');
  if (
    input.profile.gstRegistrationStatus === 'UNREGISTERED' &&
    !input.profile.section9FiveApplicable
  ) {
    throw new Error('An unregistered hotel requires a reviewed Section 9(5) classification.');
  }

  const customerTaxableAmount = grossUpVendorBase(input.vendorBaseAmount);
  const customerTaxableNightlyAmount = grossUpVendorBase(input.vendorNightlyBaseAmount);
  const hotelRate = hotelGstBasisPoints(customerTaxableNightlyAmount);
  const hotelGstAmount = roundedBasisPoints(customerTaxableAmount, hotelRate);
  const customerTotalAmount = customerTaxableAmount + hotelGstAmount;
  const commissionGrossAmount = customerTaxableAmount - input.vendorBaseAmount;
  const commissionTaxableAmount = Math.round(
    (commissionGrossAmount * 10_000) / (10_000 + MARKETPLACE_TAX_RULE.commissionGstBasisPoints),
  );
  const commissionGstAmount = commissionGrossAmount - commissionTaxableAmount;
  const gstRegistered = input.profile.gstRegistrationStatus === 'REGISTERED';
  const gstTcsAmount = gstRegistered
    ? roundedBasisPoints(customerTaxableAmount, MARKETPLACE_TAX_RULE.gstTcsBasisPoints)
    : 0;
  const incomeTaxTdsAmount = input.profile.section194OExempt
    ? 0
    : roundedBasisPoints(customerTotalAmount, MARKETPLACE_TAX_RULE.incomeTaxTdsBasisPoints);
  const gatewayFeeAmount = roundedBasisPoints(
    customerTotalAmount,
    MARKETPLACE_TAX_RULE.gatewayFeeBasisPoints,
  );
  const gatewayFeeGstAmount = roundedBasisPoints(
    gatewayFeeAmount,
    MARKETPLACE_TAX_RULE.gatewayFeeGstBasisPoints,
  );
  const vendorGrossAmount = input.vendorBaseAmount + (gstRegistered ? hotelGstAmount : 0);
  const vendorSettlementAmount = vendorGrossAmount - gstTcsAmount - incomeTaxTdsAmount;
  const ecoGstLiabilityAmount = gstRegistered ? 0 : hotelGstAmount;

  return {
    commissionGstAmount,
    commissionGrossAmount,
    commissionTaxableAmount,
    customerTaxableAmount,
    customerTotalAmount,
    ecoGstLiabilityAmount,
    gatewayFeeAmount,
    gatewayFeeGstAmount,
    gstTcsAmount,
    hotelGstAmount,
    hotelGstBasisPoints: hotelRate,
    incomeTaxTdsAmount,
    platformContributionAmount: commissionTaxableAmount - gatewayFeeAmount - gatewayFeeGstAmount,
    ruleVersion: MARKETPLACE_TAX_RULE.version,
    vendorBaseAmount: input.vendorBaseAmount,
    vendorGrossAmount,
    vendorSettlementAmount,
  };
}

export function calculateMarketplaceHotelNight(input: {
  profile: MarketplaceTaxProfile;
  vendorNightlyBaseAmount: number;
}) {
  return calculateMarketplaceHotelTax({
    profile: input.profile,
    vendorBaseAmount: input.vendorNightlyBaseAmount,
    vendorNightlyBaseAmount: input.vendorNightlyBaseAmount,
  });
}
