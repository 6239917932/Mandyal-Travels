export const ADMIN_SEARCH_PROJECTION_CONFIRMATION = 'REBUILD HOTEL SEARCH';

export type AdminSearchProjectionStatus = 'ATTENTION' | 'EMPTY' | 'HEALTHY';

export type AdminSearchProjectionHealth = {
  currentCount: number;
  latestProjectedAt: Date | null;
  missingCount: number;
  outdatedCount: number;
  projectedCount: number;
  sourceCount: number;
  staleCount: number;
  status: AdminSearchProjectionStatus;
};

type AdminSearchProjectionHealthInput = {
  currentCount: number;
  latestProjectedAt?: Date | null;
  outdatedCount: number;
  projectedCount: number;
  sourceCount: number;
};

function isCount(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function normalizeAdminSearchProjectionRebuild(value: {
  confirmation?: unknown;
  reason?: unknown;
}) {
  const confirmation = typeof value.confirmation === 'string' ? value.confirmation.trim() : '';
  const reason = typeof value.reason === 'string' ? value.reason.trim() : '';
  if (
    confirmation !== ADMIN_SEARCH_PROJECTION_CONFIRMATION ||
    reason.length < 10 ||
    reason.length > 500
  ) {
    return null;
  }
  return { confirmation: ADMIN_SEARCH_PROJECTION_CONFIRMATION, reason };
}

export function normalizeAdminSearchProjectionHealth(
  input: AdminSearchProjectionHealthInput,
): AdminSearchProjectionHealth | null {
  const { currentCount, outdatedCount, projectedCount, sourceCount } = input;
  if (
    ![currentCount, outdatedCount, projectedCount, sourceCount].every(isCount) ||
    currentCount + outdatedCount > sourceCount ||
    currentCount + outdatedCount > projectedCount
  ) {
    return null;
  }

  const missingCount = sourceCount - currentCount - outdatedCount;
  const staleCount = projectedCount - currentCount - outdatedCount;
  const status: AdminSearchProjectionStatus =
    sourceCount === 0 && projectedCount === 0
      ? 'EMPTY'
      : missingCount === 0 && outdatedCount === 0 && staleCount === 0
        ? 'HEALTHY'
        : 'ATTENTION';

  return {
    currentCount,
    latestProjectedAt: input.latestProjectedAt ?? null,
    missingCount,
    outdatedCount,
    projectedCount,
    sourceCount,
    staleCount,
    status,
  };
}
