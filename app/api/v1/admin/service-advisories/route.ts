import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { normalizeServiceAdvisoryCreate } from '@/services/serviceAdvisoryPolicy';
import { createServiceAdvisory } from '@/services/serviceAdvisoryService';

export async function POST(request: Request) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return Response.json({ error: 'Platform administrator access is required.' }, { status: 403 });
  }
  const body = await readJsonObject(request, 4096);
  const advisory = body ? normalizeServiceAdvisoryCreate(body) : null;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (!advisory || reason.length < 10 || reason.length > 500) {
    return Response.json(
      {
        error:
          'Enter valid advisory content, timing, scope, severity, state, and an audit reason between 10 and 500 characters.',
      },
      { status: 400 },
    );
  }

  try {
    const created = await createServiceAdvisory({
      actorUserId: administrator.id,
      advisory,
      reason,
    });
    return Response.json(
      { data: { publicReference: created.publicReference, status: created.status } },
      { status: 201 },
    );
  } catch (error) {
    console.error('Service advisory creation failed.', error);
    return Response.json({ error: 'The service advisory could not be created.' }, { status: 500 });
  }
}
