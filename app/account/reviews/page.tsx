import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { HotelReviewForm } from '@/components/hotel/HotelReviewForm';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  CUSTOMER_REVIEW_PAGE_SIZE,
  CUSTOMER_REVIEW_RESULT_LIMIT,
  CUSTOMER_REVIEW_STATUSES,
  customerReviewCenterPath,
  customerReviewCutoff,
  customerReviewEligibleBookingWhere,
  customerReviewHistoryWhere,
  customerReviewStatusLabel,
  normalizeCustomerReviewFilters,
} from '@/services/customerReviewCenterService';

export const metadata: Metadata = { title: 'My stay reviews' };

type SearchValue = string | string[] | undefined;
type Props = {
  searchParams: Promise<{
    eligiblePage?: SearchValue;
    reviewPage?: SearchValue;
    status?: SearchValue;
  }>;
};

function date(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

function hotelName(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function CustomerReviewCenter({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=%2Faccount%2Freviews');

  const filters = normalizeCustomerReviewFilters(await searchParams);
  const today = customerReviewCutoff();
  const eligibleWhere = customerReviewEligibleBookingWhere({ today, userEmail: user.email });
  const reviewWhere = customerReviewHistoryWhere(user.id, filters.status);
  const [eligibleCount, matchingReviewCount, pendingCount, publishedCount, rejectedCount] =
    await Promise.all([
      prisma.booking.count({ where: eligibleWhere }),
      prisma.hotelReview.count({ where: reviewWhere }),
      prisma.hotelReview.count({ where: { status: 'PENDING', userId: user.id } }),
      prisma.hotelReview.count({ where: { status: 'PUBLISHED', userId: user.id } }),
      prisma.hotelReview.count({ where: { status: 'REJECTED', userId: user.id } }),
    ]);
  const eligiblePageCount = Math.max(
    1,
    Math.ceil(Math.min(eligibleCount, CUSTOMER_REVIEW_RESULT_LIMIT) / CUSTOMER_REVIEW_PAGE_SIZE),
  );
  const reviewPageCount = Math.max(
    1,
    Math.ceil(
      Math.min(matchingReviewCount, CUSTOMER_REVIEW_RESULT_LIMIT) / CUSTOMER_REVIEW_PAGE_SIZE,
    ),
  );
  const eligiblePage = Math.min(filters.eligiblePage, eligiblePageCount);
  const reviewPage = Math.min(filters.reviewPage, reviewPageCount);
  const activeFilters = { ...filters, eligiblePage, reviewPage };
  const [eligibleBookings, reviews] = await Promise.all([
    prisma.booking.findMany({
      orderBy: [{ createdAt: 'desc' }, { confirmationCode: 'asc' }],
      select: {
        confirmationCode: true,
        hotelSlug: true,
        quote: { select: { checkInDate: true, checkOutDate: true } },
      },
      skip: (eligiblePage - 1) * CUSTOMER_REVIEW_PAGE_SIZE,
      take: CUSTOMER_REVIEW_PAGE_SIZE,
      where: eligibleWhere,
    }),
    prisma.hotelReview.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        body: true,
        createdAt: true,
        hotelSlug: true,
        moderationNote: true,
        partnerReply: true,
        partnerRepliedAt: true,
        rating: true,
        status: true,
        title: true,
      },
      skip: (reviewPage - 1) * CUSTOMER_REVIEW_PAGE_SIZE,
      take: CUSTOMER_REVIEW_PAGE_SIZE,
      where: reviewWhere,
    }),
  ]);

  return (
    <section className="account-page business-report">
      <header className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Verified-stay feedback</p>
          <h1>My stay reviews</h1>
          <p>
            Review only stays completed under your signed-in email and follow each human moderation
            decision.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account">
          Back to my account
        </Link>
      </header>

      <div className="partner-bookings__summary" aria-label="Review summary">
        <Card>
          <span>Eligible stays</span>
          <strong>{eligibleCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={pendingCount ? 'admin-metric admin-metric--attention' : 'admin-metric'}>
          <span>Awaiting moderation</span>
          <strong>{pendingCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Published</span>
          <strong>{publishedCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Not published</span>
          <strong>{rejectedCount.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      <section className="account-trips" aria-labelledby="eligible-review-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Eligibility</p>
          <h2 id="eligible-review-heading">Completed stays ready for feedback</h2>
          <p>
            A stay appears only after the property records checkout. Cancelled, no-show, upcoming,
            and unverified stays do not qualify.
          </p>
        </div>
        {eligibleCount > CUSTOMER_REVIEW_RESULT_LIMIT ? (
          <Card className="ui-card--padded">
            <strong>Showing a bounded eligibility history.</strong>
            <p>
              Only the latest {CUSTOMER_REVIEW_RESULT_LIMIT} eligible stays can be browsed here.
            </p>
          </Card>
        ) : null}
        {eligibleBookings.length ? (
          <div className="account-trips__list">
            {eligibleBookings.map((booking) => (
              <Card className="account-trip" key={booking.confirmationCode}>
                <div className="account-trip__topline">
                  <strong>{hotelName(booking.hotelSlug)}</strong>
                  <span>Checked out</span>
                </div>
                <dl>
                  <div>
                    <dt>Stay dates</dt>
                    <dd>
                      {booking.quote.checkInDate} to {booking.quote.checkOutDate}
                    </dd>
                  </div>
                  <div>
                    <dt>Booking reference</dt>
                    <dd>{booking.confirmationCode}</dd>
                  </div>
                </dl>
                <HotelReviewForm
                  bookingReference={booking.confirmationCode}
                  hotelSlug={booking.hotelSlug}
                />
              </Card>
            ))}
          </div>
        ) : (
          <Card className="account-trips__empty ui-card--padded">
            <strong>No completed stays are ready for review.</strong>
            <p>
              Checked-out hotel stays will appear here when they are confirmed under your current
              account email.
            </p>
          </Card>
        )}
        <nav aria-label="Eligible stay pages" className="business-audit-pagination">
          {eligiblePage > 1 ? (
            <Link
              className="ui-button ui-button--secondary"
              href={customerReviewCenterPath(activeFilters, { eligiblePage: eligiblePage - 1 })}
            >
              Previous eligible stays
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {eligiblePage} of {eligiblePageCount}
          </span>
          {eligiblePage < eligiblePageCount ? (
            <Link
              className="ui-button ui-button--secondary"
              href={customerReviewCenterPath(activeFilters, { eligiblePage: eligiblePage + 1 })}
            >
              Next eligible stays
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </section>

      <section className="account-trips" aria-labelledby="submitted-review-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Review history</p>
          <h2 id="submitted-review-heading">Submitted reviews</h2>
          <p>Pending reviews remain private until a platform administrator publishes them.</p>
        </div>
        <form className="business-report__filters" method="get">
          <input name="eligiblePage" type="hidden" value={eligiblePage} />
          <label className="ui-field">
            <span className="ui-field__label">Moderation state</span>
            <select className="ui-input" defaultValue={filters.status} name="status">
              {CUSTOMER_REVIEW_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All states' : customerReviewStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <div className="business-report__filter-actions">
            <button className="ui-button ui-button--primary" type="submit">
              Apply filter
            </button>
            <Link className="ui-button ui-button--secondary" href="/account/reviews">
              Clear
            </Link>
          </div>
        </form>
        {matchingReviewCount > CUSTOMER_REVIEW_RESULT_LIMIT ? (
          <Card className="ui-card--padded">
            <strong>Showing a bounded review history.</strong>
            <p>Refine the state filter to find reviews beyond the first 500 matches.</p>
          </Card>
        ) : null}
        {reviews.length ? (
          <div className="account-trips__list">
            {reviews.map((review, index) => (
              <Card
                className="account-trip"
                key={`${review.createdAt.toISOString()}-${review.hotelSlug}-${index}`}
              >
                <div className="account-trip__topline">
                  <strong>{review.title}</strong>
                  <span>{customerReviewStatusLabel(review.status)}</span>
                </div>
                <p>
                  {hotelName(review.hotelSlug)} · {review.rating}/5 · submitted{' '}
                  {date(review.createdAt)}
                </p>
                <p>{review.body}</p>
                {review.status === 'REJECTED' && review.moderationNote ? (
                  <p>
                    <strong>Moderation guidance:</strong> {review.moderationNote}
                  </p>
                ) : null}
                {review.status === 'PUBLISHED' && review.partnerReply ? (
                  <blockquote>
                    <strong>Property response:</strong> {review.partnerReply}
                    {review.partnerRepliedAt ? ` · ${date(review.partnerRepliedAt)}` : ''}
                  </blockquote>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="account-trips__empty ui-card--padded">
            <strong>No reviews match this state.</strong>
            <p>Submit feedback from an eligible stay or change the moderation filter.</p>
          </Card>
        )}
        <nav aria-label="Submitted review pages" className="business-audit-pagination">
          {reviewPage > 1 ? (
            <Link
              className="ui-button ui-button--secondary"
              href={customerReviewCenterPath(activeFilters, { reviewPage: reviewPage - 1 })}
            >
              Previous reviews
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {reviewPage} of {reviewPageCount}
          </span>
          {reviewPage < reviewPageCount ? (
            <Link
              className="ui-button ui-button--secondary"
              href={customerReviewCenterPath(activeFilters, { reviewPage: reviewPage + 1 })}
            >
              Next reviews
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </section>

      <Card className="account-trips__empty ui-card--padded">
        <strong>Hotel reviews only</strong>
        <p>
          Flight, bus, and car feedback programmes are not launched. This center never changes a
          booking, payment, refund, inventory record, or supplier status.
        </p>
      </Card>
    </section>
  );
}
