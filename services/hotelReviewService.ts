import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { hotelReviewRepository } from '@/repositories/hotelReviewRepository';
import {
  customerReviewCutoff,
  customerReviewEligibleBookingWhere,
} from '@/services/customerReviewCenterService';
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
    bookingReference: string;
    body: string;
    hotelSlug: string;
    rating: number;
    title: string;
    userEmail: string;
    userId: string;
  }): Promise<HotelReview> {
    const bookingReference = input.bookingReference.trim();
    const title = normalizeText(input.title, 100);
    const body = normalizeText(input.body, 2_000);
    if (
      !bookingReference ||
      bookingReference.length > 100 ||
      !Number.isInteger(input.rating) ||
      input.rating < 1 ||
      input.rating > 5 ||
      title.length < 3 ||
      body.length < 20
    ) {
      throw new HotelReviewRuleError(
        'INVALID_REVIEW',
        'Choose a rating and enter a title plus at least 20 characters about your stay.',
      );
    }

    try {
      return await prisma.$transaction(
        async (transaction) => {
          const eligibleBooking = await transaction.booking.findFirst({
            select: { id: true },
            where: customerReviewEligibleBookingWhere({
              bookingReference,
              hotelSlug: input.hotelSlug,
              today: customerReviewCutoff(),
              userEmail: input.userEmail,
            }),
          });
          if (!eligibleBooking) {
            throw new HotelReviewRuleError(
              'NO_ELIGIBLE_STAY',
              'This exact booking is not an eligible completed stay for your account.',
            );
          }

          return hotelReviewRepository.create(
            {
              body,
              bookingId: eligibleBooking.id,
              hotelSlug: input.hotelSlug,
              rating: input.rating,
              title,
              userId: input.userId,
            },
            transaction,
          );
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (error instanceof HotelReviewRuleError) throw error;
      if (hasPrismaErrorCode(error, 'P2002') || hasPrismaErrorCode(error, 'P2034')) {
        throw new HotelReviewRuleError(
          'NO_ELIGIBLE_STAY',
          'This stay was reviewed concurrently. Refresh your review center.',
        );
      }
      throw error;
    }
  },

  async getHotelReviews(
    hotelSlug: string,
  ): Promise<{ reviews: HotelReview[]; summary: HotelReviewSummary }> {
    const [reviews, summary] = await Promise.all([
      hotelReviewRepository.findPublishedByHotel(hotelSlug),
      hotelReviewRepository.summarizePublishedByHotel(hotelSlug),
    ]);
    return { reviews, summary };
  },
};
