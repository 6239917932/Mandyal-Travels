import { getPlatformAdmin } from '@/lib/adminAuth';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { parseInquiryDecision } from '@/lib/admin/contactInquiryRules';
import { reviewContactInquiry } from '@/lib/admin/contactInquiryStore';
import { prisma } from '@/lib/prisma';

const messages: Record<string, string> = {
  INQUIRY_ACTION_INVALID: 'Choose a valid request action.',
  INQUIRY_VERSION_REQUIRED: 'Refresh this request before saving your decision.',
  INQUIRY_REASON_REQUIRED: 'Enter an internal decision note between 5 and 1,000 characters.',
  INQUIRY_NOT_FOUND: 'This request was not found.',
  INQUIRY_VERSION_CONFLICT:
    'Another administrator changed this request. Refresh before deciding again.',
  INQUIRY_TRANSITION_INVALID:
    'That action is unavailable for the current request status. Refresh the page.',
};
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> },
) {
  if (!isSameOriginMutation(request))
    return Response.json({ error: { message: 'Invalid request origin.' } }, { status: 403 });
  const admin = await getPlatformAdmin();
  if (!admin)
    return Response.json(
      { error: { message: 'Platform administrator access is required.' } },
      { status: 403 },
    );
  try {
    const decision = parseInquiryDecision(await readJsonObject(request, 8192));
    const { inquiryId } = await params;
    return Response.json({
      data: await reviewContactInquiry(prisma, { ...decision, inquiryId, actorUserId: admin.id }),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const status =
      code === 'INQUIRY_NOT_FOUND'
        ? 404
        : ['INQUIRY_VERSION_CONFLICT', 'INQUIRY_TRANSITION_INVALID'].includes(code)
          ? 409
          : messages[code]
            ? 400
            : 500;
    return Response.json(
      {
        error: {
          code: messages[code] ? code : 'INQUIRY_REVIEW_FAILED',
          message: messages[code] ?? 'The request decision could not be saved. Please try again.',
        },
      },
      { status },
    );
  }
}
