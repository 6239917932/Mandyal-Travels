import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PartnerHotelReviewReply } from '@/components/partner/PartnerHotelReviewReply';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Guest reviews' };

export default async function PartnerHotelReviewsPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partners');
  const reviews = await prisma.hotelReview.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    where: { hotelSlug: { in: access.allowedHotelSlugs ?? [] }, status: 'PUBLISHED' },
  });
  return (
    <section className="account-page review-governance">
      <Link className="hotel-details-page__back-link" href="/partner">Back to supplier workspace</Link>
      <header className="account-trips__heading"><p className="hotel-page__eyebrow">Guest feedback</p><h1>Published hotel reviews</h1><p>Respond professionally on behalf of the property. Responses are public and audited.</p></header>
      <div className="review-governance__list">
        {reviews.map((review) => (
          <Card key={review.id}>
            <div className="review-governance__heading"><div><strong>{review.title}</strong><span>{review.hotelSlug}</span></div><strong>{review.rating}/5</strong></div>
            <p>{review.body}</p>
            {review.partnerReply ? <div className="hotel-review__partner-reply"><strong>Published response</strong><p>{review.partnerReply}</p></div> : <PartnerHotelReviewReply reviewId={review.id} />}
          </Card>
        ))}
        {reviews.length === 0 ? <Card><strong>No published reviews are available for your properties.</strong></Card> : null}
      </div>
    </section>
  );
}
