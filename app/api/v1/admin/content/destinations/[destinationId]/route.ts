import { revalidatePath } from 'next/cache';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  destinationContentMissingFields,
  destinationContentStatus,
  normalizeDestinationContentInput,
} from '@/services/destinationContentService';

type RouteContext = { params: Promise<{ destinationId: string }> };

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return Response.json({ error: 'Platform administrator access is required.' }, { status: 403 });
  }
  const destinationId = (await context.params).destinationId;
  const body = await readJsonObject(request, 16 * 1024);
  const input = body ? normalizeDestinationContentInput(body) : null;
  if (!input || input.expectedVersion < 1) {
    return Response.json(
      { error: 'Enter valid destination content, version, state, and change reason.' },
      { status: 400 },
    );
  }
  try {
    const destination = await prisma.$transaction(async (transaction) => {
      const current = await transaction.destinationContent.findUnique({
        where: { id: destinationId },
      });
      if (!current) throw new Error('NOT_FOUND');
      if (current.version !== input.expectedVersion) throw new Error('VERSION_CONFLICT');
      const status = destinationContentStatus(current.status, input.action);
      if (status === 'PUBLISHED' && destinationContentMissingFields(input).length) {
        throw new Error('PUBLISHED_CONTENT_INCOMPLETE');
      }
      const updated = await transaction.destinationContent.update({
        data: {
          bestTimeToVisit: input.bestTimeToVisit,
          changeReason: input.reason,
          country: input.country,
          heroImageUrl: input.heroImageUrl,
          highlightsJson: JSON.stringify(input.highlights),
          introduction: input.introduction,
          name: input.name,
          publishedAt:
            input.action === 'PUBLISH'
              ? new Date()
              : input.action === 'UNPUBLISH'
                ? null
                : current.publishedAt,
          slug: input.slug,
          state: input.state,
          status,
          summary: input.summary,
          travelTipsJson: JSON.stringify(input.travelTips),
          updatedByUserId: administrator.id,
          version: { increment: 1 },
        },
        where: { id: destinationId },
      });
      await transaction.destinationContentEvent.create({
        data: {
          action: input.action,
          actorUserId: administrator.id,
          destinationId: updated.id,
          reason: input.reason,
          status: updated.status,
          version: updated.version,
        },
      });
      return { previousSlug: current.slug, updated };
    });
    revalidatePath('/admin/content');
    revalidatePath('/destinations');
    revalidatePath(`/destinations/${destination.previousSlug}`);
    revalidatePath(`/destinations/${destination.updated.slug}`);
    return Response.json({
      data: {
        id: destination.updated.id,
        status: destination.updated.status,
        version: destination.updated.version,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return Response.json({ error: 'The destination entry was not found.' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
      return Response.json(
        { error: 'This entry changed in another session. Refresh and review it again.' },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === 'PUBLISHED_CONTENT_INCOMPLETE') {
      return Response.json(
        {
          error:
            'Published content must remain complete. Unpublish it before saving an incomplete draft.',
        },
        { status: 400 },
      );
    }
    if (isUniqueConflict(error)) {
      return Response.json(
        { error: 'That destination URL slug is already in use.' },
        { status: 409 },
      );
    }
    console.error('Destination content update failed.', error);
    return Response.json(
      { error: 'The destination content could not be updated.' },
      { status: 500 },
    );
  }
}
