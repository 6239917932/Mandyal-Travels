import type { Prisma } from '@/generated/prisma/client';

export const CUSTOMER_REVIEW_PAGE_SIZE = 20;
export const CUSTOMER_REVIEW_RESULT_LIMIT = 500;
export const CUSTOMER_REVIEW_MAX_PAGE = Math.ceil(
  CUSTOMER_REVIEW_RESULT_LIMIT / CUSTOMER_REVIEW_PAGE_SIZE,
);
export const CUSTOMER_REVIEW_STATUSES = ['ALL', 'PENDING', 'PUBLISHED', 'REJECTED'] as const;

export type CustomerReviewStatus = (typeof CUSTOMER_REVIEW_STATUSES)[number];
export type CustomerReviewFilters = {
  eligiblePage: number;
  reviewPage: number;
  status: CustomerReviewStatus;
};

type SearchValue = string | string[] | undefined;

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function page(value: SearchValue) {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, CUSTOMER_REVIEW_MAX_PAGE)
    : 1;
}

function required(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

export function customerReviewCutoff(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function normalizeCustomerReviewFilters(values: {
  eligiblePage?: SearchValue;
  reviewPage?: SearchValue;
  status?: SearchValue;
}): CustomerReviewFilters {
  const candidate = (first(values.status) ?? '').trim().toUpperCase();
  const status = CUSTOMER_REVIEW_STATUSES.some((item) => item === candidate)
    ? (candidate as CustomerReviewStatus)
    : 'ALL';
  return {
    eligiblePage: page(values.eligiblePage),
    reviewPage: page(values.reviewPage),
    status,
  };
}

export function customerReviewCenterPath(
  filters: CustomerReviewFilters,
  pages: { eligiblePage?: number; reviewPage?: number } = {},
) {
  const params = new URLSearchParams({
    eligiblePage: String(
      Math.min(Math.max(1, pages.eligiblePage ?? filters.eligiblePage), CUSTOMER_REVIEW_MAX_PAGE),
    ),
    reviewPage: String(
      Math.min(Math.max(1, pages.reviewPage ?? filters.reviewPage), CUSTOMER_REVIEW_MAX_PAGE),
    ),
  });
  if (filters.status !== 'ALL') params.set('status', filters.status);
  return `/account/reviews?${params.toString()}`;
}

export function customerReviewEligibleBookingWhere(input: {
  bookingReference?: string;
  hotelSlug?: string;
  today: string;
  userEmail: string;
}): Prisma.BookingWhereInput {
  const userEmail = required(input.userEmail, 'Authenticated user email').toLowerCase();
  const today = required(input.today, 'Review eligibility date');
  return {
    ...(input.bookingReference === undefined
      ? {}
      : { confirmationCode: required(input.bookingReference, 'Booking reference') }),
    guest: { is: { email: userEmail } },
    ...(input.hotelSlug === undefined ? {} : { hotelSlug: required(input.hotelSlug, 'Hotel') }),
    operationalStatus: 'CHECKED_OUT',
    quote: { is: { checkOutDate: { lt: today } } },
    review: { is: null },
    status: 'confirmed',
  };
}

export function customerReviewHistoryWhere(
  userId: string,
  status: CustomerReviewStatus,
): Prisma.HotelReviewWhereInput {
  return {
    userId: required(userId, 'Authenticated user'),
    ...(status === 'ALL' ? {} : { status }),
  };
}

export function customerReviewStatusLabel(status: string) {
  if (status === 'PENDING') return 'Awaiting moderation';
  if (status === 'PUBLISHED') return 'Published';
  if (status === 'REJECTED') return 'Not published';
  return 'Status unavailable';
}
