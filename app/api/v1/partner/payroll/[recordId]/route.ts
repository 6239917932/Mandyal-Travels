import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { PartnerPayrollError, reversePartnerPayroll } from '@/services/partnerPayrollService';

type RouteContext = { params: Promise<{ recordId: string }> };
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
    return failure('HR_ACCESS_REQUIRED', 'A hotel administrator is required.', 403);
  const body = await readJsonObject(request, 2048);
  const { recordId } = await context.params;
  try {
    const record = await reversePartnerPayroll({
      actorUserId: access.userId,
      note: body?.note,
      partnerId: access.partnerId,
      recordId,
      version: body?.version,
    });
    await recordPartnerAudit(access, {
      action: 'HOTEL_PAYROLL_REVERSED',
      entityId: record.id,
      entityType: 'HOTEL_PAYROLL_RECORD',
      summary: `Payroll register reversed for ${record.period}.`,
    });
    return Response.json({ data: { id: record.id, status: record.status } });
  } catch (error) {
    return error instanceof PartnerPayrollError
      ? failure(error.code, error.message, 409)
      : failure('PAYROLL_REVERSAL_FAILED', 'The payroll record could not be reversed.', 500);
  }
}
