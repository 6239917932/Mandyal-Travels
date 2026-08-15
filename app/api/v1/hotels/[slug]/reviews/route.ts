import { getCurrentUser } from '@/lib/auth/session';
import { hotelService } from '@/services/hotelService';
import { HotelReviewRuleError, hotelReviewService } from '@/services/hotelReviewService';

type ReviewRouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: ReviewRouteContext): Promise<Response> {
  const { slug } = await context.params;
  if (!(await hotelService.getHotelBySlug(slug))) {
    return Response.json({ error: { code: 'HOTEL_NOT_FOUND', message: 'The hotel was not found.' } }, { status: 404 });
  }
  return Response.json({ data: await hotelReviewService.getHotelReviews(slug) });
}

export async function POST(request: Request, context: ReviewRouteContext): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: { code: 'AUTH_REQUIRED', message: 'Sign in to review a completed stay.' } }, { status: 401 });
  }
  const { slug } = await context.params;
  if (!(await hotelService.getHotelBySlug(slug))) {
    return Response.json({ error: { code: 'HOTEL_NOT_FOUND', message: 'The hotel was not found.' } }, { status: 404 });
  }

  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== 'object') throw new HotelReviewRuleError('INVALID_REVIEW', 'Enter a valid review.');
    const body = value as Record<string, unknown>;
    if (typeof body.title !== 'string' || typeof body.body !== 'string' || typeof body.rating !== 'number') {
      throw new HotelReviewRuleError('INVALID_REVIEW', 'Enter a valid rating, title, and review.');
    }
    const review = await hotelReviewService.createVerifiedReview({
      body: body.body,
      hotelSlug: slug,
      rating: body.rating,
      title: body.title,
      userEmail: user.email,
      userId: user.id,
    });
    return Response.json({ data: review }, { status: 201 });
  } catch (error) {
    if (error instanceof HotelReviewRuleError) {
      return Response.json({ error: { code: error.code, message: error.message } }, { status: 400 });
    }
    return Response.json({ error: { code: 'REVIEW_SAVE_FAILED', message: 'The review could not be saved.' } }, { status: 500 });
  }
}
