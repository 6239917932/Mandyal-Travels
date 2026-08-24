import { createHash } from 'node:crypto';

export const ADMIN_REVIEW_PAGE_SIZE = 25;
export const ADMIN_REVIEW_RESULT_LIMIT = 1_000;
export const ADMIN_REVIEW_STATUSES = ['ALL', 'PENDING', 'PUBLISHED', 'REJECTED'] as const;
export const ADMIN_REVIEW_RATINGS = ['ALL', '5', '4', '3', '2', '1'] as const;
export const ADMIN_REVIEW_WINDOWS = ['ALL', '7', '30', '90'] as const;

type SearchValue = string | string[] | undefined;
export type AdminReviewStatus = (typeof ADMIN_REVIEW_STATUSES)[number];
export type AdminReviewRating = (typeof ADMIN_REVIEW_RATINGS)[number];
export type AdminReviewWindow = (typeof ADMIN_REVIEW_WINDOWS)[number];
export type AdminReviewFilters = {
  page: number;
  query: string;
  rating: AdminReviewRating;
  status: AdminReviewStatus;
  window: AdminReviewWindow;
};

function first(value: SearchValue): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function closedValue<T extends string>(value: SearchValue, allowed: readonly T[], fallback: T): T {
  const normalized = first(value).trim().toUpperCase();
  return allowed.includes(normalized as T) ? (normalized as T) : fallback;
}

export function normalizeAdminReviewFilters(input: {
  page?: SearchValue;
  q?: SearchValue;
  rating?: SearchValue;
  status?: SearchValue;
  window?: SearchValue;
}): AdminReviewFilters {
  const parsedPage = Number.parseInt(first(input.page), 10);
  return {
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    query: first(input.q).trim().replace(/\s+/g, ' ').slice(0, 100),
    rating: closedValue(input.rating, ADMIN_REVIEW_RATINGS, 'ALL'),
    status: closedValue(input.status, ADMIN_REVIEW_STATUSES, 'PENDING'),
    window: closedValue(input.window, ADMIN_REVIEW_WINDOWS, 'ALL'),
  };
}

export function adminReviewPath(filters: AdminReviewFilters, page: number): string {
  const query = new URLSearchParams();
  query.set('page', String(Math.max(1, page)));
  if (filters.query) query.set('q', filters.query);
  if (filters.status !== 'PENDING') query.set('status', filters.status);
  if (filters.rating !== 'ALL') query.set('rating', filters.rating);
  if (filters.window !== 'ALL') query.set('window', filters.window);
  return `/admin/reviews?${query.toString()}`;
}

export function reviewCreatedAfter(window: AdminReviewWindow, now = new Date()): Date | undefined {
  if (window === 'ALL') return undefined;
  const result = new Date(now);
  result.setUTCDate(result.getUTCDate() - Number(window));
  return result;
}

export function privateReviewerReference(userId: string): string {
  const digest = createHash('sha256').update(`hotel-review:${userId}`).digest('hex');
  return `REV-${digest.slice(0, 10).toUpperCase()}`;
}

export function reviewerDisplayName(firstName: string, lastName: string): string {
  const firstNameClean = firstName.trim() || 'Traveller';
  const lastInitial = lastName.trim().charAt(0).toUpperCase();
  return `${firstNameClean}${lastInitial ? ` ${lastInitial}.` : ''}`;
}

export function normalizeReviewDecision(input: {
  action?: unknown;
  note?: unknown;
}): { action: 'PUBLISH' | 'REJECT'; note: string } | null {
  if (input.action !== 'PUBLISH' && input.action !== 'REJECT') return null;
  const note =
    typeof input.note === 'string' ? input.note.trim().replace(/\s+/g, ' ').slice(0, 500) : '';
  if (input.action === 'REJECT' && note.length < 10) return null;
  return { action: input.action, note };
}
