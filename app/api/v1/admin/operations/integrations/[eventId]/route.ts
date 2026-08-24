import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { normalizeIntegrationReviewAction } from '@/services/adminExceptionWorkbenchService';

type RouteContext = { params: Promise<{ eventId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator)
    return NextResponse.json(
      { error: 'Platform administrator access is required.' },
      { status: 403 },
    );
  const body = await readJsonObject(request, 2048);
  const review = body ? normalizeIntegrationReviewAction(body) : null;
  if (!review)
    return NextResponse.json(
      {
        error:
          'Choose retry or ignore and provide the current version plus a 5-500 character note.',
      },
      { status: 400 },
    );
  const { eventId } = await context.params;
  try {
    const current = await prisma.integrationOutboxEvent.findUnique({ where: { id: eventId } });
    if (!current || !['PENDING', 'DEAD_LETTER'].includes(current.status)) {
      return NextResponse.json(
        { error: 'This event cannot be changed in its current state.' },
        { status: 409 },
      );
    }
    if (current.updatedAt.getTime() !== review.expectedUpdatedAt.getTime()) {
      return NextResponse.json(
        { error: 'This event changed after it was loaded. Refresh and review the current state.' },
        { status: 409 },
      );
    }
    const nextStatus = review.action === 'RETRY' ? 'PENDING' : 'IGNORED';
    const result = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.integrationOutboxEvent.updateMany({
        data:
          review.action === 'RETRY'
            ? {
                lastError: '',
                lockedAt: null,
                nextAttemptAt: new Date(),
                processedAt: null,
                status: nextStatus,
              }
            : { lockedAt: null, processedAt: new Date(), status: nextStatus },
        where: {
          id: eventId,
          status: current.status,
          updatedAt: review.expectedUpdatedAt,
        },
      });
      if (updated.count !== 1) return null;
      await transaction.integrationOutboxReviewEvent.create({
        data: {
          action: review.action,
          actorUserId: administrator.id,
          eventId,
          fromStatus: current.status,
          note: review.note,
          toStatus: nextStatus,
        },
      });
      return nextStatus;
    });
    if (!result) {
      return NextResponse.json(
        { error: 'This event changed during review. Refresh before trying again.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ data: { id: eventId, status: result } });
  } catch (error) {
    console.error('Integration queue action failed.', error);
    return NextResponse.json(
      { error: 'The integration event could not be updated.' },
      { status: 500 },
    );
  }
}
