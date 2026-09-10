import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { PartnerExpenseError, reversePartnerExpense } from '@/services/partnerExpenseService';

type RouteContext = { params: Promise<{ journalId: string }> };
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function PATCH(request: Request, context: RouteContext) {
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
  const body = await readJsonObject(request, 2048);
  const { journalId } = await context.params;
  try {
    const reversal = await reversePartnerExpense({
      actorUserId: access.userId,
      journalId,
      note: body?.note,
      partnerId: access.partnerId,
    });
    await recordPartnerAudit(access, {
      action: 'HOTEL_EXPENSE_REVERSED',
      entityId: reversal.id,
      entityType: 'FINANCIAL_JOURNAL',
      summary: 'A hotel expense was reversed with a balancing journal.',
    });
    return Response.json({ data: { id: reversal.id } });
  } catch (error) {
    return error instanceof PartnerExpenseError
      ? failure(error.code, error.message, 409)
      : failure('EXPENSE_REVERSAL_FAILED', 'The expense could not be reversed.', 500);
  }
}
