export const PLATFORM_FEATURES = [
  {
    defaultEnabled: true,
    description: 'Controls the guided trip-planning page and its versioned plan-generation API.',
    key: 'AI_TRIP_PLANNER',
    label: 'Guided trip planner',
  },
  {
    defaultEnabled: true,
    description: 'Controls new supplier application entry and submission. Existing access remains.',
    key: 'PARTNER_APPLICATIONS',
    label: 'New partner applications',
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
