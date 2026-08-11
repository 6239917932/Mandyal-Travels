export const BUSINESS_TRAVEL_PRODUCTS = new Set(['HOTEL', 'FLIGHT', 'BUS', 'CAR']);

type BusinessTravelPolicy = {
  approvalRequired: boolean;
  defaultCabinClass: string;
  maximumTripAmount: number | null;
};

export function evaluateBusinessTravelRequest(
  policy: BusinessTravelPolicy,
  estimatedAmount: number,
) {
  const reasons: string[] = [];

  if (policy.approvalRequired) {
    reasons.push('Organization policy requires administrator approval.');
  }

  if (policy.maximumTripAmount !== null && estimatedAmount > policy.maximumTripAmount) {
    const limit = new Intl.NumberFormat('en-IN', {
      currency: 'INR',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(policy.maximumTripAmount);
    reasons.push(`Estimated amount exceeds the ${limit} policy threshold.`);
  }

  return {
    policyReason:
      reasons.join(' ') || 'Automatically approved under the saved organization policy.',
    status: reasons.length > 0 ? 'PENDING' : 'APPROVED',
  } as const;
}
