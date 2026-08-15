import { prisma } from '@/lib/prisma';
import { hotelReviewRepository } from '@/repositories/hotelReviewRepository';
import type { HotelReview, HotelReviewSummary } from '@/types/hotel';

export class HotelReviewRuleError extends Error {
  constructor(
    readonly code: 'INVALID_REVIEW' | 'NO_ELIGIBLE_STAY',
    message: string,
  ) {
    super(message);
  }
}

function normalizeText(value: string, maximumLength: number): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, maximumLength);
}

export const hotelReviewService = {
  async createVerifiedReview(input: {
    body: string;
    hotelSlug: string;
    rating: number;
    title: string;
    userEmail: string;
    userId: string;
  }): Promise<HotelReview> {
    const title = normalizeText(input.title, 100);
    const body = normalizeText(input.body, 2_000);
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5 || title.length < 3 || body.length < 20) {
      throw new HotelReviewRuleError(
        'INVALID_REVIEW',
        'Choose a rating and enter a title plus at least 20 characters about your stay.',
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const eligibleBooking = await prisma.booking.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true },
      where: {
        guest: { is: { email: input.userEmail } },
        hotelSlug: input.hotelSlug,
        quote: { is: { checkOutDate: { lt: today } } },
        review: { is: null },
        status: 'confirmed',
      },
    });
    if (!eligibleBooking) {
      throw new HotelReviewRuleError(
        'NO_ELIGIBLE_STAY',
        'A completed, confirmed stay at this property is required before reviewing it.',
      );
    }

    return hotelReviewRepository.create({
      body,
      bookingId: eligibleBooking.id,
      hotelSlug: input.hotelSlug,
      rating: input.rating,
      title,
      userId: input.userId,
    });
  },

  async getHotelReviews(hotelSlug: string): Promise<{ reviews: HotelReview[]; summary: HotelReviewSummary }> {
    const reviews = await hotelReviewRepository.findPublishedByHotel(hotelSlug);
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return {
      reviews,
      summary: {
        averageRating: reviews.length === 0 ? 0 : total / reviews.length,
        reviewCount: reviews.length,
      },
    };
  },
};
