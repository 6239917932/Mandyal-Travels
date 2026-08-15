import { prisma } from '@/lib/prisma';
import type { HotelReview } from '@/types/hotel';

function mapReview(review: {
  body: string;
  createdAt: Date;
  id: string;
  rating: number;
  partnerReply: string | null;
  partnerRepliedAt: Date | null;
  title: string;
  user: { firstName: string; lastName: string };
}): HotelReview {
  const lastInitial = review.user.lastName.trim().charAt(0);
  return {
    body: review.body,
    createdAt: review.createdAt.toISOString(),
    id: review.id,
    ...(review.partnerReply ? { partnerReply: review.partnerReply } : {}),
    ...(review.partnerRepliedAt
      ? { partnerRepliedAt: review.partnerRepliedAt.toISOString() }
      : {}),
    rating: review.rating,
    reviewerName: `${review.user.firstName}${lastInitial ? ` ${lastInitial}.` : ''}`,
    title: review.title,
    verifiedStay: true,
  };
}

export const hotelReviewRepository = {
  async create(input: {
    body: string;
    bookingId: string;
    hotelSlug: string;
    rating: number;
    title: string;
    userId: string;
  }): Promise<HotelReview> {
    const review = await prisma.hotelReview.create({
      data: { ...input, status: 'PENDING' },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    return mapReview(review);
  },

  async findPublishedByHotel(hotelSlug: string): Promise<HotelReview[]> {
    const reviews = await prisma.hotelReview.findMany({
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      where: { hotelSlug, status: 'PUBLISHED' },
    });
    return reviews.map(mapReview);
  },
};
