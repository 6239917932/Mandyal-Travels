import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CUSTOMER_REVIEW_MAX_PAGE,
  customerReviewCenterPath,
  customerReviewEligibleBookingWhere,
  customerReviewHistoryWhere,
  customerReviewStatusLabel,
  normalizeCustomerReviewFilters,
} from '../services/customerReviewCenterService.ts';

test('customer review filters and pagination are closed and bounded', () => {
  assert.deepEqual(
    normalizeCustomerReviewFilters({ eligiblePage: '3', reviewPage: '4', status: 'published' }),
    { eligiblePage: 3, reviewPage: 4, status: 'PUBLISHED' },
  );
  assert.deepEqual(
    normalizeCustomerReviewFilters({ eligiblePage: '-1', reviewPage: '999', status: 'removed' }),
    { eligiblePage: 1, reviewPage: CUSTOMER_REVIEW_MAX_PAGE, status: 'ALL' },
  );
  assert.equal(
    customerReviewCenterPath(
      { eligiblePage: 2, reviewPage: 3, status: 'REJECTED' },
      { reviewPage: 4 },
    ),
    '/account/reviews?eligiblePage=2&reviewPage=4&status=REJECTED',
  );
});

test('eligibility requires the exact owned, confirmed, checked-out, past, unreviewed stay', () => {
  assert.deepEqual(
    customerReviewEligibleBookingWhere({
      bookingReference: ' MT-H-2026 ',
      hotelSlug: ' hill-view ',
      today: '2026-08-24',
      userEmail: ' Guest@Example.com ',
    }),
    {
      confirmationCode: 'MT-H-2026',
      guest: { is: { email: 'guest@example.com' } },
      hotelSlug: 'hill-view',
      operationalStatus: 'CHECKED_OUT',
      quote: { is: { checkOutDate: { lt: '2026-08-24' } } },
      review: { is: null },
      status: 'confirmed',
    },
  );
  assert.throws(
    () =>
      customerReviewEligibleBookingWhere({
        bookingReference: '',
        hotelSlug: 'hill-view',
        today: '2026-08-24',
        userEmail: 'guest@example.com',
      }),
    /Booking reference/,
  );
});

test('review history is exact-user scoped and unknown states fail closed', () => {
  assert.deepEqual(customerReviewHistoryWhere(' user-42 ', 'PENDING'), {
    status: 'PENDING',
    userId: 'user-42',
  });
  assert.equal(customerReviewStatusLabel('UNKNOWN'), 'Status unavailable');
});

test('submission rechecks eligibility transactionally and maps concurrent writes to conflict', async () => {
  const service = await readFile(
    new URL('../services/hotelReviewService.ts', import.meta.url),
    'utf8',
  );
  const route = await readFile(
    new URL('../app/api/v1/hotels/[slug]/reviews/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(service, /const bookingReference = input\.bookingReference\.trim\(\)/);
  assert.match(service, /bookingReference,\r?\n\s+hotelSlug: input\.hotelSlug/);
  assert.match(service, /isolationLevel: 'Serializable'/);
  assert.match(service, /hasPrismaErrorCode\(error, 'P2002'\)/);
  assert.match(service, /hasPrismaErrorCode\(error, 'P2034'\)/);
  assert.match(route, /readJsonObject\(request, 2_048\)/);
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /FORBIDDEN_ORIGIN/);
  assert.match(route, /action: 'HOTEL_REVIEW_CREATE'/);
  assert.match(route, /getRequestRateLimitIdentifier\(request, user\.id\)/);
  assert.match(route, /limit: 5/);
  assert.match(route, /Retry-After/);
  assert.match(route, /error\.code === 'NO_ELIGIBLE_STAY' \? 409 : 400/);
  assert.match(route, /data: \{ status: 'PENDING' \}/);
  assert.doesNotMatch(route, /data: review/);
});

test('customer UI is private, bounded, customer-reference based, and hotel-only', async () => {
  const page = await readFile(new URL('../app/account/reviews/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /getCurrentUser\(\)/);
  assert.match(page, /customerReviewHistoryWhere\(user\.id/);
  assert.match(page, /customerReviewEligibleBookingWhere\(\{ today, userEmail: user\.email \}\)/);
  assert.match(page, /take: CUSTOMER_REVIEW_PAGE_SIZE/);
  assert.match(page, /bookingReference=\{booking\.confirmationCode\}/);
  assert.match(page, /Flight, bus, and car feedback programmes are not launched/);
  assert.doesNotMatch(page, /moderationNote|moderatedBy|booking\.id|review\.id|email:\s*true/);
});

test('hotel review eligibility uses normalized indexed booking emails', async () => {
  const [bookingService, schema, migration] = await Promise.all([
    readFile(new URL('../services/hotelBookingService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../prisma/migrations/20260824120000_normalize_booking_guest_email/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  assert.match(bookingService, /email: normalizeEmail\(request\.guest\.email\)/);
  assert.match(schema, /model BookingGuest[\s\S]*@@index\(\[email\]\)/);
  assert.match(migration, /LOWER\(TRIM\("email"\)\)/);
  assert.match(migration, /BookingGuest_email_idx/);
});
