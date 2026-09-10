import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { PartnerExpenseError, recordPartnerExpense } from '@/services/partnerExpenseService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  const access = await getPartnerAccess(request);
  if (
    !access?.partnerId ||
    !access.userId ||
    access.partnerType !== 'HOTEL' ||
    access.memberRole !== 'ADMIN'
  )
    return failure('FINANCE_ACCESS_REQUIRED', 'A hotel administrator is required.', 403);
  const body = await readJsonObject(request, 4096);
  if (!body) return failure('INVALID_EXPENSE', 'Enter valid expense details.', 400);
  try {
    const journal = await recordPartnerExpense({
      actorUserId: access.userId,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      partnerId: access.partnerId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: 'HOTEL_EXPENSE_POSTED',
      entityId: journal.id,
      entityType: 'FINANCIAL_JOURNAL',
      summary: 'A balanced hotel expense journal was posted.',
    });
    return Response.json({ data: { id: journal.id } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerExpenseError
      ? failure(error.code, error.message, 409)
      : failure('EXPENSE_POST_FAILED', 'The expense could not be posted.', 500);
  }
}
