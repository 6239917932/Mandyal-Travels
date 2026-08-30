import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { normalizeServiceAdvisoryTransition } from '@/services/serviceAdvisoryPolicy';
import { ServiceAdvisoryError, transitionServiceAdvisory } from '@/services/serviceAdvisoryService';

type RouteContext = { params: Promise<{ advisoryId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return Response.json({ error: 'Platform administrator access is required.' }, { status: 403 });
  }
  const advisoryId = (await context.params).advisoryId.trim();
  const body = await readJsonObject(request, 2048);
  const transition = body ? normalizeServiceAdvisoryTransition(body) : null;
  if (!advisoryId || !transition) {
    return Response.json(
      { error: 'Choose a valid next state, current version, and reason.' },
      { status: 400 },
    );
  }

  try {
    const advisory = await transitionServiceAdvisory({
      actorUserId: administrator.id,
      advisoryId,
      transition,
    });
    return Response.json({
      data: {
        publicReference: advisory.publicReference,
        status: advisory.status,
        version: advisory.version,
      },
    });
  } catch (error) {
    if (error instanceof ServiceAdvisoryError) {
      if (error.code === 'MISSING') {
        return Response.json({ error: 'The service advisory was not found.' }, { status: 404 });
      }
      if (error.code === 'VERSION_CONFLICT') {
        return Response.json(
          { error: 'This advisory changed in another session. Refresh and review it again.' },
          { status: 409 },
        );
      }
      return Response.json(
        { error: 'That lifecycle change is not allowed for this advisory.' },
        { status: 400 },
      );
    }
    console.error('Service advisory transition failed.', error);
    return Response.json({ error: 'The service advisory could not be updated.' }, { status: 500 });
  }
}
