import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

type Context = { params: Promise<{ applicationId: string }> };
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(request: Request, { params }: Context) {
  const admin = await getPlatformAdmin();
  if (!admin) return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  const body = await readJsonObject(request);
  const action = body?.action;
  const reviewNote = typeof body?.reviewNote === 'string' ? body.reviewNote.trim() : '';
  if (action !== 'APPROVE' && action !== 'REJECT')
    return failure('INVALID_DECISION', 'Choose approve or reject.', 400);
  if (action === 'REJECT' && reviewNote.length < 3)
    return failure('REVIEW_NOTE_REQUIRED', 'Add a short rejection reason.', 400);
  try {
    const { applicationId } = await params;
    return Response.json({
      data: await partnerOperationsService.reviewApplication({
        applicationId,
        decision: action,
        reviewerUserId: admin.id,
        reviewNote,
      }),
    });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('REVIEW_FAILED', 'The supplier review could not be saved.', 500);
  }
}
