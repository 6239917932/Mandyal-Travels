export const PLATFORM_FEATURES = [
  {
    defaultEnabled: true,
    description: 'Controls the guided trip-planning page and its versioned plan-generation API.',
    key: 'AI_TRIP_PLANNER',
    label: 'Guided trip planner',
  },
  {
    defaultEnabled: true,
    description:
      'Accepts supplier applications for administrator review while listings, payouts, and live payments remain separately gated.',
    key: 'PARTNER_APPLICATIONS',
    label: 'New partner applications',
  },
  {
    defaultEnabled: true,
    description:
      'Allows administrator-provisioned private supplier workspaces for trial data entry while public listings, payouts, paid onboarding, and live payments remain disabled.',
    key: 'TRIAL_PARTNER_WORKSPACES',
    label: 'Private trial partner workspaces',
  },
  {
    defaultEnabled: false,
    description:
      'Controls paid or coupon-waived supplier enrollment. Enable only after PayU return reconciliation, approved agreement evidence, and phone OTP delivery are complete.',
    key: 'PAID_PARTNER_ONBOARDING',
    label: 'Paid partner onboarding',
  },
  {
    defaultEnabled: false,
    description:
      'Controls supplier payout-account linking through the approved payment provider. Raw bank or UPI credentials must never be collected by this portal.',
    key: 'PARTNER_PAYOUT_ONBOARDING',
    label: 'Partner payout onboarding',
  },
  {
    defaultEnabled: false,
    description:
      'Controls publication of approved partner-managed inventory. Enable only after contracts, tax profiles, and listing review are complete.',
    key: 'PUBLIC_PARTNER_LISTINGS',
    label: 'Public partner listings',
  },
  {
    defaultEnabled: false,
    description:
      'Controls creation of PayU hosted live-payment checkout intents. Enable only after PayU callback, webhook, reconciliation, refund, GST, and payout readiness are approved.',
    key: 'LIVE_MARKETPLACE_PAYMENTS',
    label: 'Live marketplace payments',
  },
  {
    defaultEnabled: false,
    description:
      'Controls customer-facing direct car inventory. Keep disabled until transport classification and licensing are approved.',
    key: 'CAR_MARKETPLACE',
    label: 'Direct car marketplace',
  },
] as const;

export type PlatformFeatureKey = (typeof PLATFORM_FEATURES)[number]['key'];

const PLATFORM_FEATURE_KEYS = new Set<string>(PLATFORM_FEATURES.map((feature) => feature.key));

export function isPlatformFeatureKey(value: string): value is PlatformFeatureKey {
  return PLATFORM_FEATURE_KEYS.has(value);
}

export function normalizePlatformFeatureFlagUpdate(value: {
  enabled?: unknown;
  expectedVersion?: unknown;
  reason?: unknown;
}) {
  const expectedVersion = Number(value.expectedVersion);
  const reason = typeof value.reason === 'string' ? value.reason.trim() : '';
  if (
    typeof value.enabled !== 'boolean' ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0 ||
    reason.length < 10 ||
    reason.length > 500
  ) {
    return null;
  }
  return { enabled: value.enabled, expectedVersion, reason };
}

export function resolvePlatformFeatureState(
  key: PlatformFeatureKey,
  override: { enabled: boolean; version: number } | undefined,
) {
  const definition = PLATFORM_FEATURES.find((feature) => feature.key === key);
  if (!definition) throw new Error(`Unknown platform feature: ${key}`);
  return {
    ...definition,
    enabled: override?.enabled ?? definition.defaultEnabled,
    version: override?.version ?? 0,
  };
}
