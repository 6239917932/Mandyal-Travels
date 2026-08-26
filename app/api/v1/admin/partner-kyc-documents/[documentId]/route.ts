import { getPlatformAdmin } from '@/lib/adminAuth';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { isPartnerKycDocumentStatus } from '@/lib/partner/kycDocumentRules';
import {
  PartnerKycGovernanceError,
  transitionPartnerKycDocument,
} from '@/services/partnerKycGovernanceService';

type Context = { params: Promise<{ documentId: string }> };
const ADMIN_TARGETS = new Set([
  'UNDER_REVIEW',
  'CHANGES_REQUESTED',
  'VERIFIED',
  'REJECTED',
  'REVOKED',
]);

export async function PATCH(request: Request, { params }: Context) {
  if (!isSameOriginMutation(request))
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const admin = await getPlatformAdmin();
  if (!admin)
    return Response.json({ error: 'Platform administrator access is required.' }, { status: 403 });
  const body = await readJsonObject(request);
  if (
    !body ||
    !isPartnerKycDocumentStatus(body.targetStatus) ||
    !ADMIN_TARGETS.has(body.targetStatus) ||
    !Number.isInteger(body.expectedVersion)
  )
    return Response.json(
      { error: 'A valid review action and current version are required.' },
      { status: 400 },
    );
  try {
    const { documentId } = await params;
    return Response.json({
      data: await transitionPartnerKycDocument({
        actorUserId: admin.id,
        documentId,
        expectedVersion: body.expectedVersion as number,
        reviewNote: typeof body.reviewNote === 'string' ? body.reviewNote : null,
        targetStatus: body.targetStatus,
      }),
    });
  } catch (error) {
    const status = error instanceof PartnerKycGovernanceError ? error.status : 500;
    return Response.json(
      {
        error:
          status === 500
            ? 'The document review could not be saved.'
            : error instanceof Error
              ? error.message
              : 'Request failed.',
      },
      { status },
    );
  }
}
