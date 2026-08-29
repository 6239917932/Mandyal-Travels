import type {
  HotelbedsContentReadiness,
  HotelbedsContentReadinessState,
} from './hotelbedsContentReadiness.ts';
import { HOTELBEDS_CONTENT_STALE_HOURS } from './hotelbedsContentReadiness.ts';
import type { HotelbedsConfigurationPosture } from './hotelbedsRules.ts';

export type HotelbedsContentDeploymentStatus = 'attention' | 'disabled' | 'ready' | 'unavailable';

export type HotelbedsContentDeploymentReason =
  | 'CACHE_AGING'
  | 'CACHE_FRESH'
  | 'CACHE_NOT_READY'
  | 'CACHE_STALE'
  | 'CONNECTOR_DISABLED'
  | 'CREDENTIALS_INCOMPLETE'
  | 'ENVIRONMENT_BLOCKED'
  | 'LAST_SYNC_FAILED'
  | 'MIGRATION_REQUIRED'
  | 'SYNC_DISABLED'
  | 'SYNC_RUNNING';

export interface HotelbedsContentDeploymentReadiness {
  reason: HotelbedsContentDeploymentReason;
  required: boolean;
  status: HotelbedsContentDeploymentStatus;
}

type ContentResult =
  | { available: false; state: 'MIGRATION_REQUIRED' }
  | { available: true; readiness: HotelbedsContentReadiness };

function unavailable(
  reason: HotelbedsContentDeploymentReason,
): HotelbedsContentDeploymentReadiness {
  return { reason, required: true, status: 'unavailable' };
}

function cacheUsable(readiness: HotelbedsContentReadiness): boolean {
  return (
    readiness.activePropertyCount > 0 &&
    readiness.ageHours !== undefined &&
    readiness.ageHours <= HOTELBEDS_CONTENT_STALE_HOURS
  );
}

export function hotelbedsContentDeploymentReadiness(input: {
  configuration: HotelbedsConfigurationPosture;
  content?: ContentResult;
  syncEnabled: boolean;
}): HotelbedsContentDeploymentReadiness {
  if (!input.syncEnabled) {
    return { reason: 'SYNC_DISABLED', required: false, status: 'disabled' };
  }
  if (!input.configuration.enabled) return unavailable('CONNECTOR_DISABLED');
  if (!input.configuration.configured) return unavailable('CREDENTIALS_INCOMPLETE');
  if (input.configuration.productionBlocked) return unavailable('ENVIRONMENT_BLOCKED');
  if (!input.content || !input.content.available) return unavailable('MIGRATION_REQUIRED');

  const { readiness } = input.content;
  const state: HotelbedsContentReadinessState = readiness.state;
  if (state === 'FRESH') return { reason: 'CACHE_FRESH', required: true, status: 'ready' };
  if (state === 'AGING') {
    return { reason: 'CACHE_AGING', required: true, status: 'attention' };
  }
  if (state === 'RUNNING' && cacheUsable(readiness)) {
    return { reason: 'SYNC_RUNNING', required: true, status: 'attention' };
  }
  if (state === 'FAILED' && cacheUsable(readiness)) {
    return { reason: 'LAST_SYNC_FAILED', required: true, status: 'attention' };
  }
  if (
    state === 'STALE' ||
    (readiness.ageHours !== undefined && readiness.ageHours > HOTELBEDS_CONTENT_STALE_HOURS)
  ) {
    return unavailable('CACHE_STALE');
  }
  return unavailable('CACHE_NOT_READY');
}
