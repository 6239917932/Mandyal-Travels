import type { PrismaClient } from '../../generated/prisma/client.ts';
import { inquiryTargetStatus, type InquiryAction } from './contactInquiryRules.ts';

export async function reviewContactInquiry(
  database: Pick<PrismaClient, '$transaction'>,
  input: {
    inquiryId: string;
    actorUserId: string;
    action: InquiryAction;
    expectedVersion: number;
    reason: string;
  },
) {
  return database.$transaction(async (transaction) => {
    const current = await transaction.contactInquiry.findUnique({ where: { id: input.inquiryId } });
    if (!current) throw new Error('INQUIRY_NOT_FOUND');
    if (current.version !== input.expectedVersion) throw new Error('INQUIRY_VERSION_CONFLICT');
    const status = inquiryTargetStatus(current.status, input.action);
    const updated = await transaction.contactInquiry.updateMany({
      where: { id: current.id, version: input.expectedVersion, status: current.status },
      data: { status, version: { increment: 1 }, reviewNote: input.reason, reviewedAt: new Date() },
    });
    if (updated.count !== 1) throw new Error('INQUIRY_VERSION_CONFLICT');
    await transaction.contactInquiryReviewEvent.create({
      data: {
        inquiryId: current.id,
        actorUserId: input.actorUserId,
        action: input.action,
        fromStatus: current.status,
        toStatus: status,
        reason: input.reason,
        version: current.version + 1,
      },
    });
    return { id: current.id, status, version: current.version + 1 };
  });
}
