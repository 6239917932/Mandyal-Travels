import { prisma } from '@/lib/prisma';
import {
  PLATFORM_FEATURES,
  type PlatformFeatureKey,
  resolvePlatformFeatureState,
} from '@/services/platformFeatureFlagRules';

export async function getPlatformFeatureStates() {
  const overrides = await prisma.platformFeatureFlag.findMany({
    select: { enabled: true, key: true, version: true },
  });
  const byKey = new Map(overrides.map((override) => [override.key, override]));
  return PLATFORM_FEATURES.map((feature) =>
    resolvePlatformFeatureState(feature.key, byKey.get(feature.key)),
  );
}

export async function isPlatformFeatureEnabled(key: PlatformFeatureKey) {
  const override = await prisma.platformFeatureFlag.findUnique({
    select: { enabled: true },
    where: { key },
  });
  return override?.enabled ?? resolvePlatformFeatureState(key, undefined).defaultEnabled;
}
