import { createHash } from 'node:crypto';

export const ADMIN_NOTIFICATION_PAGE_SIZE = 25;
export const ADMIN_NOTIFICATION_RESULT_LIMIT = 1000;
export const ADMIN_NOTIFICATION_STATUSES = [
  'ALL',
  'QUEUED',
  'PROCESSING',
  'DELIVERED',
  'FAILED',
  'DEAD_LETTER',
] as const;
export const ADMIN_NOTIFICATION_CHANNELS = ['ALL', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH'] as const;
export const ADMIN_NOTIFICATION_WINDOWS = ['7', '30', '90', 'ALL'] as const;

export type AdminNotificationStatus = (typeof ADMIN_NOTIFICATION_STATUSES)[number];
export type AdminNotificationChannel = (typeof ADMIN_NOTIFICATION_CHANNELS)[number];
export type AdminNotificationWindow = (typeof ADMIN_NOTIFICATION_WINDOWS)[number];

export type AdminNotificationFilters = {
  channel: AdminNotificationChannel;
  page: number;
  query: string;
  status: AdminNotificationStatus;
  window: AdminNotificationWindow;
};

type SearchValue = string | string[] | undefined;

const first = (value: SearchValue) => (Array.isArray(value) ? value[0] : value);

function catalogueValue<const T extends readonly string[]>(
  value: SearchValue,
  catalogue: T,
  fallback: T[number],
): T[number] {
  const candidate = (first(value) ?? '').trim().toUpperCase();
  return catalogue.some((item) => item === candidate) ? (candidate as T[number]) : fallback;
}

export function normalizeAdminNotificationFilters(values: {
  channel?: SearchValue;
  page?: SearchValue;
  q?: SearchValue;
  status?: SearchValue;
  window?: SearchValue;
}): AdminNotificationFilters {
  const page = Number(first(values.page));
  return {
    channel: catalogueValue(values.channel, ADMIN_NOTIFICATION_CHANNELS, 'ALL'),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    query: (first(values.q) ?? '').trim().replace(/\s+/g, ' ').slice(0, 100),
    status: catalogueValue(values.status, ADMIN_NOTIFICATION_STATUSES, 'ALL'),
    window: catalogueValue(values.window, ADMIN_NOTIFICATION_WINDOWS, '30'),
  };
}

export function adminNotificationPath(filters: AdminNotificationFilters, page: number) {
  const params = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (filters.query) params.set('q', filters.query);
  if (filters.status !== 'ALL') params.set('status', filters.status);
  if (filters.channel !== 'ALL') params.set('channel', filters.channel);
  if (filters.window !== '30') params.set('window', filters.window);
  return `/admin/notifications?${params.toString()}`;
}

export function notificationWindowStart(window: AdminNotificationWindow, now: Date) {
  if (window === 'ALL') return null;
  const result = new Date(now);
  result.setUTCDate(result.getUTCDate() - Number(window));
  return result;
}

export function privateRecipientReference(channel: string, recipient: string) {
  return createHash('sha256')
    .update(`${channel}:${recipient}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
}

export function notificationDeliveryPosture(input: {
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  now: Date;
  status: string;
  updatedAt: Date;
}) {
  if (input.status === 'DELIVERED') return 'DELIVERED' as const;
  if (input.status === 'DEAD_LETTER') return 'ACTION_REQUIRED' as const;
  if (input.status === 'FAILED') return 'RETRY_AVAILABLE' as const;
  if (
    input.status === 'PROCESSING' &&
    input.updatedAt.getTime() <= input.now.getTime() - 15 * 60 * 1000
  )
    return 'STALE_PROCESSING' as const;
  if (input.status === 'PROCESSING') return 'IN_PROGRESS' as const;
  if (input.status === 'QUEUED' && input.nextAttemptAt <= input.now) return 'READY' as const;
  if (input.status === 'QUEUED') return 'SCHEDULED' as const;
  if (input.attempts >= input.maxAttempts) return 'ACTION_REQUIRED' as const;
  return 'UNKNOWN' as const;
}

export function hasNotificationErrorEvidence(lastError: string) {
  return lastError.trim().length > 0;
}
