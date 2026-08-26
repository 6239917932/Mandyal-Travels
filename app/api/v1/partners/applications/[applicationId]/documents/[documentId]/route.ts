import { getCurrentUser } from '@/lib/auth/session';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import {
  PartnerKycGovernanceError,
  submitOwnedPartnerKycDocument,
} from '@/services/partnerKycGovernanceService';

type Context = { params: Promise<{ applicationId: string; documentId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!isSameOriginMutation(request))
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in is required.' }, { status: 401 });
  const body = await readJsonObject(request);
  if (body?.action !== 'SUBMIT' || !Number.isInteger(body.expectedVersion)) {
    return Response.json(
      { error: 'Submit action and current version are required.' },
      { status: 400 },
    );
  }
  try {
    const { applicationId, documentId } = await params;
    return Response.json({
      data: await submitOwnedPartnerKycDocument({
        actorUserId: user.id,
        applicationId,
        documentId,
        expectedVersion: body.expectedVersion as number,
      }),
    });
  } catch (error) {
    const status = error instanceof PartnerKycGovernanceError ? error.status : 500;
    return Response.json(
      {
        error:
          status === 500
            ? 'Document could not be submitted.'
            : error instanceof Error
              ? error.message
              : 'Request failed.',
      },
      { status },
    );
  }
}
