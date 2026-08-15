import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
  const administrator = await getPlatformAdmin();
  if (!administrator)
    return Response.json(
      { error: { code: 'ADMIN_REQUIRED', message: 'Platform administrator access is required.' } },
      { status: 403 },
    );
  const body = await readJsonObject(request);
  const action = body?.action;
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : '';
  if (action !== 'PUBLISH' && action !== 'REJECT')
    return Response.json(
      { error: { code: 'INVALID_DECISION', message: 'Choose publish or reject.' } },
      { status: 400 },
    );
  if (action === 'REJECT' && note.length < 3)
    return Response.json(
      {
        error: { code: 'NOTE_REQUIRED', message: 'Enter a short reason when rejecting a review.' },
      },
      { status: 400 },
    );
  const { reviewId } = await context.params;
  const updated = await prisma.hotelReview.updateMany({
    data: {
      moderatedAt: new Date(),
      moderatedByUserId: administrator.id,
      moderationNote: note || null,
      status: action === 'PUBLISH' ? 'PUBLISHED' : 'REJECTED',
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
    data: { id: reviewId, status: action === 'PUBLISH' ? 'PUBLISHED' : 'REJECTED' },
  });
}
