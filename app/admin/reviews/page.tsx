import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminHotelReviewAction } from '@/components/admin/AdminHotelReviewAction';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Hotel review moderation' };

export default async function AdminHotelReviewsPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/reviews');
  const reviews = await prisma.hotelReview.findMany({
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
    where: { status: 'PENDING' },
  });
  return (
    <section className="account-page platform-admin-page review-governance admin-workspace">
      <Link className="hotel-details-page__back-link" href="/admin">
        Back to operations
      </Link>
      <header className="admin-hero">
        <p className="hotel-page__eyebrow">Trust and safety</p>
        <h1>Hotel review moderation</h1>
        <p>
          Publish genuine, relevant verified-stay feedback or reject abusive and inappropriate
          content.
        </p>
      </header>
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
              {review.user.firstName} {review.user.lastName} · {review.user.email}
            </small>
            <AdminHotelReviewAction reviewId={review.id} />
          </Card>
        ))}
        {reviews.length === 0 ? (
          <Card className="admin-empty-state admin-empty-state--card">
            <div>
              <span className="admin-empty-state__icon" aria-hidden="true">
                ✓
              </span>
              <strong>Review queue is clear</strong>
              <p>No hotel reviews are awaiting moderation.</p>
            </div>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
