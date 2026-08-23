import { revalidatePath } from 'next/cache';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  destinationContentStatus,
  normalizeDestinationContentInput,
} from '@/services/destinationContentService';

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

export async function POST(request: Request) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return Response.json({ error: 'Platform administrator access is required.' }, { status: 403 });
  }
  const body = await readJsonObject(request, 16 * 1024);
  const input = body ? normalizeDestinationContentInput(body) : null;
  if (!input || input.expectedVersion !== 0 || input.action === 'UNPUBLISH') {
    return Response.json(
      { error: 'Enter valid destination content, a change reason, and a supported initial state.' },
      { status: 400 },
    );
  }
  try {
    const destination = await prisma.$transaction(async (transaction) => {
      const created = await transaction.destinationContent.create({
        data: {
          bestTimeToVisit: input.bestTimeToVisit,
          changeReason: input.reason,
          country: input.country,
          createdByUserId: administrator.id,
          heroImageUrl: input.heroImageUrl,
          highlightsJson: JSON.stringify(input.highlights),
          introduction: input.introduction,
          name: input.name,
          publishedAt: input.action === 'PUBLISH' ? new Date() : null,
          slug: input.slug,
          state: input.state,
          status: destinationContentStatus(undefined, input.action),
          summary: input.summary,
          travelTipsJson: JSON.stringify(input.travelTips),
          updatedByUserId: administrator.id,
          version: 1,
        },
      });
      await transaction.destinationContentEvent.create({
        data: {
          action: input.action === 'PUBLISH' ? 'CREATED_AND_PUBLISHED' : 'CREATED_DRAFT',
          actorUserId: administrator.id,
          destinationId: created.id,
          reason: input.reason,
          status: created.status,
          version: created.version,
        },
      });
      return created;
    });
    revalidatePath('/admin/content');
    revalidatePath('/destinations');
    revalidatePath(`/destinations/${destination.slug}`);
    return Response.json(
      { data: { id: destination.id, version: destination.version } },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConflict(error)) {
      return Response.json(
        { error: 'That destination URL slug is already in use.' },
        { status: 409 },
      );
    }
    console.error('Destination content creation failed.', error);
    return Response.json(
      { error: 'The destination content could not be created.' },
      { status: 500 },
    );
  }
}
