export const USER_ACCESS_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
export const USER_ACCESS_ACTIONS = ['SUSPEND', 'RESTORE'] as const;

export type UserAccessStatus = (typeof USER_ACCESS_STATUSES)[number];
export type UserAccessAction = (typeof USER_ACCESS_ACTIONS)[number];

export type UserAccessChangeRequest = {
  action: UserAccessAction;
  confirmation: string;
  expectedVersion: number;
  reason: string;
};

const ACTION_SET = new Set<string>(USER_ACCESS_ACTIONS);

export function isUserAccessStatus(value: string): value is UserAccessStatus {
  return USER_ACCESS_STATUSES.includes(value as UserAccessStatus);
}

export function userAccessConfirmation(action: UserAccessAction, email: string): string {
  return `${action} ${email}`;
}

export function normalizeUserAccessChange(
  value: Record<string, unknown>,
): UserAccessChangeRequest | null {
  const action = typeof value.action === 'string' ? value.action.trim().toUpperCase() : '';
  const confirmation = typeof value.confirmation === 'string' ? value.confirmation.trim() : '';
  const rawVersion = value.expectedVersion;
  const expectedVersion =
    typeof rawVersion === 'number'
      ? rawVersion
      : typeof rawVersion === 'string' && /^\d+$/.test(rawVersion.trim())
        ? Number(rawVersion)
        : Number.NaN;
  const reason = typeof value.reason === 'string' ? value.reason.trim().replace(/\s+/g, ' ') : '';

  if (
    !ACTION_SET.has(action) ||
    !confirmation ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0 ||
    reason.length < 10 ||
    reason.length > 500
  ) {
    return null;
  }

  return {
    action: action as UserAccessAction,
    confirmation,
    expectedVersion,
    reason,
  };
}

export function userAccessTargetStatus(
  currentStatus: UserAccessStatus,
  action: UserAccessAction,
): UserAccessStatus | null {
  if (currentStatus === 'ACTIVE' && action === 'SUSPEND') return 'SUSPENDED';
  if (currentStatus === 'SUSPENDED' && action === 'RESTORE') return 'ACTIVE';
  return null;
}
