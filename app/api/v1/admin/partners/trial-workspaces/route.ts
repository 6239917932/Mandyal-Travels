import { getPlatformAdmin } from '@/lib/adminAuth';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import {
  grantPrivatePartnerTrialWorkspace,
  PartnerTrialWorkspaceError,
} from '@/services/partnerTrialWorkspaceService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return failure('INVALID_ORIGIN', 'Use the Mandyal Travels administrator portal.', 403);
  }
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  }
  const body = await readJsonObject(request, 4096);
  if (!body) return failure('INVALID_REQUEST', 'Enter the private trial details.', 400);
  const partnerType =
    body.partnerType === 'CAR' || body.partnerType === 'HOTEL' ? body.partnerType : null;
  if (!partnerType) {
    return failure('INVALID_REQUEST', 'Choose a hotel or car trial workspace.', 400);
  }

  try {
    return Response.json(
      {
        data: await grantPrivatePartnerTrialWorkspace({
          actorUserId: administrator.id,
          confirmation: typeof body.confirmation === 'string' ? body.confirmation : '',
          email: typeof body.email === 'string' ? body.email : '',
          partnerType,
          reason: typeof body.reason === 'string' ? body.reason : '',
          workspaceName: typeof body.workspaceName === 'string' ? body.workspaceName : '',
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PartnerTrialWorkspaceError) {
      const status =
        error.code === 'ACCOUNT_NOT_FOUND'
          ? 404
          : error.code === 'INVALID_REQUEST' || error.code === 'CONFIRMATION_MISMATCH'
            ? 400
            : 409;
      return failure(error.code, error.message, status);
    }
    console.error('Private partner trial provisioning failed.', error);
    return failure(
      'TRIAL_PROVISIONING_FAILED',
      'Private partner trial access could not be granted.',
      500,
    );
  }
}
