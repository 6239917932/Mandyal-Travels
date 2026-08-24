import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { normalizeUserAccessChange } from '@/services/adminUserAccessRules';
import { AdminUserAccessError, changeUserAccess } from '@/services/adminUserAccessService';

type RouteContext = { params: Promise<{ userId: string }> };

const ERROR_RESPONSES: Record<
  Exclude<AdminUserAccessError['code'], 'MISSING_USER'>,
  { message: string; status: number }
> = {
  ACTOR_NOT_AUTHORIZED: {
    message: 'Platform administrator access is required.',
    status: 403,
  },
  CONFIRMATION_MISMATCH: {
    message: 'Enter the exact confirmation phrase shown for this account.',
    status: 400,
  },
  LAST_ACTIVE_ADMIN: {
    message: 'The last active platform administrator cannot be suspended.',
    status: 409,
  },
  SELF_SUSPENSION: {
    message: 'You cannot suspend your own administrator account.',
    status: 409,
  },
  TRANSITION_NOT_ALLOWED: {
    message: 'That access action is not allowed from the current account state.',
    status: 409,
  },
  VERSION_CONFLICT: {
    message: 'This account changed after it was opened. Refresh and review it again.',
    status: 409,
  },
};

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return Response.json({ error: 'Platform administrator access is required.' }, { status: 403 });
  }

  const body = await readJsonObject(request, 2048);
  const change = body ? normalizeUserAccessChange(body) : null;
  if (!change) {
    return Response.json(
      {
        error:
          'Provide a supported action, current version, exact confirmation, and reason between 10 and 500 characters.',
      },
      { status: 400 },
    );
  }

  const { userId } = await context.params;
  if (!userId.trim())
    return Response.json({ error: 'The account was not found.' }, { status: 404 });

  try {
    const result = await changeUserAccess({
      actorUserId: administrator.id,
      request: change,
      targetUserId: userId,
    });
    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof AdminUserAccessError) {
      if (error.code === 'MISSING_USER') {
        return Response.json({ error: 'The account was not found.' }, { status: 404 });
      }
      const response = ERROR_RESPONSES[error.code];
      return Response.json({ error: response.message }, { status: response.status });
    }
    if (hasPrismaErrorCode(error, 'P2034')) {
      return Response.json(
        { error: 'Another administrator changed account access. Refresh and review it again.' },
        { status: 409 },
      );
    }
    console.error('Administrator user-access change failed.', error);
    return Response.json({ error: 'Account access could not be updated.' }, { status: 500 });
  }
}
