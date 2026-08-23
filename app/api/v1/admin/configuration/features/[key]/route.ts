import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  isPlatformFeatureKey,
  normalizePlatformFeatureFlagUpdate,
  resolvePlatformFeatureState,
} from '@/services/platformFeatureFlagRules';

type RouteContext = { params: Promise<{ key: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return Response.json({ error: 'Platform administrator access is required.' }, { status: 403 });
  }
  const key = (await context.params).key.trim().toUpperCase();
  if (!isPlatformFeatureKey(key)) {
    return Response.json({ error: 'Choose a supported platform feature.' }, { status: 404 });
  }
  const body = await readJsonObject(request, 2048);
  const update = body ? normalizePlatformFeatureFlagUpdate(body) : null;
  if (!update) {
    return Response.json(
      { error: 'Enter a valid state, version, and reason between 10 and 500 characters.' },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.platformFeatureFlag.findUnique({ where: { key } });
      const currentVersion = current?.version ?? 0;
      if (currentVersion !== update.expectedVersion) throw new Error('VERSION_CONFLICT');
      const currentEnabled =
        current?.enabled ?? resolvePlatformFeatureState(key, undefined).defaultEnabled;
      if (currentEnabled === update.enabled) throw new Error('NO_CHANGE');
      const nextVersion = currentVersion + 1;
      const flag = current
        ? await transaction.platformFeatureFlag.update({
            data: {
              changeReason: update.reason,
              enabled: update.enabled,
              updatedByUserId: administrator.id,
              version: nextVersion,
            },
            where: { key },
          })
        : await transaction.platformFeatureFlag.create({
            data: {
              changeReason: update.reason,
              enabled: update.enabled,
              key,
              updatedByUserId: administrator.id,
              version: nextVersion,
            },
          });
      await transaction.platformFeatureFlagEvent.create({
        data: {
          actorUserId: administrator.id,
          enabled: flag.enabled,
          flagKey: key,
          reason: update.reason,
          version: flag.version,
        },
      });
      return { enabled: flag.enabled, key: flag.key, version: flag.version };
    });
    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
      return Response.json(
        { error: 'This feature changed in another session. Refresh and review it again.' },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === 'NO_CHANGE') {
      return Response.json({ error: 'The requested state is already active.' }, { status: 400 });
    }
    console.error('Platform feature update failed.', error);
    return Response.json({ error: 'The release control could not be updated.' }, { status: 500 });
  }
}
