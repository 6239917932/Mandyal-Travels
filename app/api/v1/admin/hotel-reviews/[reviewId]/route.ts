import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { normalizeReviewDecision } from '@/services/adminReviewModerationService';

type Context = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
  const administrator = await getPlatformAdmin();
  if (!administrator)
    return Response.json(
      { error: { code: 'ADMIN_REQUIRED', message: 'Platform administrator access is required.' } },
      { status: 403 },
    );
  const body = await readJsonObject(request, 2_048);
  const decision = normalizeReviewDecision({ action: body?.action, note: body?.note });
  if (!decision)
    return Response.json(
      {
        error: {
          code: 'INVALID_DECISION',
          message:
            'Choose publish or reject. Rejections require a reason of at least 10 characters.',
        },
      },
      { status: 400 },
    );
  const { reviewId } = await context.params;
  const updated = await prisma.hotelReview.updateMany({
    data: {
      moderatedAt: new Date(),
      moderatedByUserId: administrator.id,
      moderationNote: decision.note || null,
      status: decision.action === 'PUBLISH' ? 'PUBLISHED' : 'REJECTED',
    },
    where: { id: reviewId, status: 'PENDING' },
  });
  if (updated.count === 0)
    return Response.json(
      {
        error: {
          code: 'REVIEW_UNAVAILABLE',
          message: 'This review is no longer awaiting moderation.',
        },
      },
      { status: 409 },
    );
  return Response.json({
    data: { id: reviewId, status: decision.action === 'PUBLISH' ? 'PUBLISHED' : 'REJECTED' },
  });
}
