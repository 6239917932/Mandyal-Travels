export const CUSTOMER_NOTIFICATION_PAGE_SIZE = 20;
export const CUSTOMER_NOTIFICATION_RESULT_LIMIT = 500;
export const CUSTOMER_NOTIFICATION_MAX_PAGE = Math.ceil(
  CUSTOMER_NOTIFICATION_RESULT_LIMIT / CUSTOMER_NOTIFICATION_PAGE_SIZE,
);
export const CUSTOMER_NOTIFICATION_CHANNELS = ['ALL', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH'] as const;
export const CUSTOMER_NOTIFICATION_STATUSES = ['ALL', 'DELIVERED', 'PENDING', 'DELAYED'] as const;
export const CUSTOMER_NOTIFICATION_WINDOWS = ['30', '90', 'ALL'] as const;

export type CustomerNotificationChannel = (typeof CUSTOMER_NOTIFICATION_CHANNELS)[number];
export type CustomerNotificationStatus = (typeof CUSTOMER_NOTIFICATION_STATUSES)[number];
export type CustomerNotificationWindow = (typeof CUSTOMER_NOTIFICATION_WINDOWS)[number];

export type CustomerNotificationFilters = {
  channel: CustomerNotificationChannel;
  page: number;
  status: CustomerNotificationStatus;
  window: CustomerNotificationWindow;
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

export function normalizeCustomerNotificationFilters(values: {
  channel?: SearchValue;
  page?: SearchValue;
  status?: SearchValue;
  window?: SearchValue;
}): CustomerNotificationFilters {
  const page = Number(first(values.page));
  return {
    channel: catalogueValue(values.channel, CUSTOMER_NOTIFICATION_CHANNELS, 'ALL'),
    page:
      Number.isSafeInteger(page) && page > 0 ? Math.min(page, CUSTOMER_NOTIFICATION_MAX_PAGE) : 1,
    status: catalogueValue(values.status, CUSTOMER_NOTIFICATION_STATUSES, 'ALL'),
    window: catalogueValue(values.window, CUSTOMER_NOTIFICATION_WINDOWS, '30'),
  };
}

export function customerNotificationPath(filters: CustomerNotificationFilters, page: number) {
  const params = new URLSearchParams({
    page: String(Math.min(Math.max(1, page), CUSTOMER_NOTIFICATION_MAX_PAGE)),
  });
  if (filters.status !== 'ALL') params.set('status', filters.status);
  if (filters.channel !== 'ALL') params.set('channel', filters.channel);
  if (filters.window !== '30') params.set('window', filters.window);
  return `/account/notifications?${params.toString()}`;
}

export function customerNotificationWindowStart(window: CustomerNotificationWindow, now: Date) {
  if (window === 'ALL') return null;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - Number(window));
  return start;
}

export function customerNotificationInternalStatuses(status: CustomerNotificationStatus) {
  if (status === 'DELIVERED') return ['DELIVERED'];
  if (status === 'PENDING') return ['QUEUED', 'PROCESSING'];
  if (status === 'DELAYED') return ['FAILED', 'DEAD_LETTER'];
  return null;
}

export function customerNotificationStatus(status: string) {
  if (status === 'DELIVERED') return { label: 'Delivered', tone: 'positive' } as const;
  if (status === 'FAILED' || status === 'DEAD_LETTER')
    return { label: 'Delivery delayed', tone: 'attention' } as const;
  if (status === 'QUEUED' || status === 'PROCESSING')
    return { label: 'In progress', tone: 'neutral' } as const;
  return { label: 'Status unavailable', tone: 'neutral' } as const;
}

export function customerNotificationTitle(templateKey: string) {
  const key = templateKey.trim().toUpperCase();
  if (key.includes('PASSWORD')) return 'Password and account update';
  if (key.includes('SECURITY') || key.includes('LOGIN') || key.includes('MFA'))
    return 'Security update';
  if (key.includes('REFUND')) return 'Refund update';
  if (key.includes('PAYMENT')) return 'Payment update';
  if (key.includes('BOOKING') || key.includes('CONFIRM')) return 'Booking update';
  if (key.includes('TRIP') || key.includes('REMINDER')) return 'Travel reminder';
  if (key.includes('SUPPORT')) return 'Support update';
  return 'Account update';
}

export function customerNotificationChannelLabel(channel: string) {
  if (channel === 'WHATSAPP') return 'WhatsApp';
  if (channel === 'SMS') return 'SMS';
  if (channel === 'PUSH') return 'Push notification';
  return 'Email';
}
