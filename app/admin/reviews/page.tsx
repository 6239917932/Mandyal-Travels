import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@/generated/prisma/client';

import { AdminHotelReviewAction } from '@/components/admin/AdminHotelReviewAction';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_REVIEW_PAGE_SIZE,
  ADMIN_REVIEW_RATINGS,
  ADMIN_REVIEW_RESULT_LIMIT,
  ADMIN_REVIEW_STATUSES,
  ADMIN_REVIEW_WINDOWS,
  adminReviewPath,
  normalizeAdminReviewFilters,
  privateReviewerReference,
  reviewCreatedAfter,
  reviewerDisplayName,
} from '@/services/adminReviewModerationService';

export const metadata: Metadata = { title: 'Hotel review moderation' };

type SearchValue = string | string[] | undefined;
type Props = {
  searchParams: Promise<{
    page?: SearchValue;
    q?: SearchValue;
    rating?: SearchValue;
    status?: SearchValue;
    window?: SearchValue;
  }>;
};

function date(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminHotelReviewsPage({ searchParams }: Props) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/reviews');
  const filters = normalizeAdminReviewFilters(await searchParams);
  const createdAfter = reviewCreatedAfter(filters.window);
  const where: Prisma.HotelReviewWhereInput = {
    ...(createdAfter ? { createdAt: { gte: createdAfter } } : {}),
    ...(filters.rating === 'ALL' ? {} : { rating: Number(filters.rating) }),
    ...(filters.status === 'ALL' ? {} : { status: filters.status }),
    ...(filters.query
      ? {
          OR: [
            { id: { contains: filters.query } },
            { bookingId: { contains: filters.query } },
            { hotelSlug: { contains: filters.query } },
            { title: { contains: filters.query } },
            { body: { contains: filters.query } },
          ],
        }
      : {}),
  };
  const [matchingCount, pendingCount, publishedCount, rejectedCount] = await Promise.all([
    prisma.hotelReview.count({ where }),
    prisma.hotelReview.count({ where: { status: 'PENDING' } }),
    prisma.hotelReview.count({ where: { status: 'PUBLISHED' } }),
    prisma.hotelReview.count({ where: { status: 'REJECTED' } }),
  ]);
  const boundedCount = Math.min(matchingCount, ADMIN_REVIEW_RESULT_LIMIT);
  const pageCount = Math.max(1, Math.ceil(boundedCount / ADMIN_REVIEW_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const reviews = await prisma.hotelReview.findMany({
    include: {
      moderatedBy: { select: { firstName: true, lastName: true } },
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    skip: (page - 1) * ADMIN_REVIEW_PAGE_SIZE,
    take: ADMIN_REVIEW_PAGE_SIZE,
    where,
  });
  const activeFilters = { ...filters, page };

  return (
    <section className="account-page platform-admin-page review-governance admin-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Trust and safety</p>
          <h1>Hotel review moderation</h1>
          <p>
            Review verified-stay feedback with privacy-safe customer references, complete history,
            and explicit human decisions.
          </p>
          <Link className="ui-button ui-button--secondary" href="/admin">
            Back to operations
          </Link>
        </div>
      </header>

      <div className="partner-bookings__summary">
        <Card className={pendingCount ? 'admin-metric admin-metric--attention' : 'admin-metric'}>
          <span>Pending review</span>
          <strong>{pendingCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Published</span>
          <strong>{publishedCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Rejected</span>
          <strong>{rejectedCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Matching records</span>
          <strong>{matchingCount.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      <form className="business-report__filters" method="get">
        <label className="ui-field business-report__search">
          <span className="ui-field__label">Review lookup</span>
          <input
            className="ui-input"
            defaultValue={filters.query}
            maxLength={100}
            name="q"
            placeholder="Review, booking, property, title, or text"
            type="search"
          />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Decision state</span>
          <select className="ui-input" defaultValue={filters.status} name="status">
            {ADMIN_REVIEW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All states' : status}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Rating</span>
          <select className="ui-input" defaultValue={filters.rating} name="rating">
            {ADMIN_REVIEW_RATINGS.map((rating) => (
              <option key={rating} value={rating}>
                {rating === 'ALL' ? 'All ratings' : `${rating} stars`}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Submitted</span>
          <select className="ui-input" defaultValue={filters.window} name="window">
            {ADMIN_REVIEW_WINDOWS.map((window) => (
              <option key={window} value={window}>
                {window === 'ALL' ? 'All dates' : `Last ${window} days`}
              </option>
            ))}
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/reviews">
            Clear
          </Link>
        </div>
      </form>

      {matchingCount > ADMIN_REVIEW_RESULT_LIMIT ? (
        <Card className="ui-card--padded">
          <strong>Deep-history limit reached.</strong>
          <p>
            Refine the filters to review records beyond the first{' '}
            {ADMIN_REVIEW_RESULT_LIMIT.toLocaleString('en-IN')} matches.
          </p>
        </Card>
      ) : null}

      <div className="review-governance__list">
        {reviews.map((review) => (
          <Card key={review.id}>
            <div className="review-governance__heading">
              <div>
                <strong>{review.title}</strong>
                <span>{review.hotelSlug}</span>
              </div>
              <strong>{review.rating}/5</strong>
            </div>
            <p>{review.body}</p>
            <small>
              {reviewerDisplayName(review.user.firstName, review.user.lastName)} ·{' '}
              {privateReviewerReference(review.userId)} · submitted {date(review.createdAt)}
            </small>
            <p>
              <strong>Status:</strong> {review.status}
              {review.moderatedAt ? ` · decided ${date(review.moderatedAt)}` : ''}
              {review.moderatedBy
                ? ` by ${reviewerDisplayName(review.moderatedBy.firstName, review.moderatedBy.lastName)}`
                : ''}
            </p>
            {review.moderationNote ? <p>Moderation note: {review.moderationNote}</p> : null}
            {review.status === 'PENDING' ? <AdminHotelReviewAction reviewId={review.id} /> : null}
          </Card>
        ))}
        {reviews.length === 0 ? (
          <Card className="admin-empty-state admin-empty-state--card">
            <div>
              <span className="admin-empty-state__icon" aria-hidden="true">
                ✓
              </span>
              <strong>No matching reviews</strong>
              <p>Change the filters or return to the pending moderation queue.</p>
            </div>
          </Card>
        ) : null}
      </div>

      <nav aria-label="Hotel review pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link
            className="ui-button ui-button--secondary"
            href={adminReviewPath(activeFilters, page - 1)}
          >
            Previous page
          </Link>
        ) : (
          <span />
        )}
        <span>
          Page {page} of {pageCount}
        </span>
        {page < pageCount ? (
          <Link
            className="ui-button ui-button--secondary"
            href={adminReviewPath(activeFilters, page + 1)}
          >
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
