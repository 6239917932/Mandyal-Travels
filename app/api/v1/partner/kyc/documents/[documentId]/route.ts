import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import {
  PartnerKycGovernanceError,
  submitOwnedPartnerKycDocument,
} from '@/services/partnerKycGovernanceService';

type Context = { params: Promise<{ documentId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!isSameOriginMutation(request))
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const access = await getPartnerAccess(request);
  if (
    !access?.partnerId ||
    !access.userId ||
    access.mode !== 'user-session' ||
    access.memberRole !== 'ADMIN'
  )
    return Response.json(
      { error: 'Named partner administrator access is required.' },
      { status: 403 },
    );
  const body = await readJsonObject(request);
  if (body?.action !== 'SUBMIT' || !Number.isInteger(body.expectedVersion))
    return Response.json(
      { error: 'Submit action and current version are required.' },
      { status: 400 },
    );
  try {
    const { documentId } = await params;
    return Response.json({
      data: await submitOwnedPartnerKycDocument({
        actorUserId: access.userId,
        documentId,
        expectedVersion: body.expectedVersion as number,
        partnerId: access.partnerId,
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
