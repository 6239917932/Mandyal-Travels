import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { PartnerPayrollError, postPartnerPayroll } from '@/services/partnerPayrollService';

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
    return failure('HR_ACCESS_REQUIRED', 'A hotel administrator is required.', 403);
  const body = await readJsonObject(request, 4096);
  if (!body) return failure('INVALID_PAYROLL', 'Enter valid payroll details.', 400);
  try {
    const record = await postPartnerPayroll({
      actorUserId: access.userId,
      partnerId: access.partnerId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: 'HOTEL_PAYROLL_POSTED',
      entityId: record.id,
      entityType: 'HOTEL_PAYROLL_RECORD',
      summary: `Payroll register posted for ${record.period}.`,
    });
    return Response.json({ data: { id: record.id } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerPayrollError
      ? failure(error.code, error.message, 409)
      : failure('PAYROLL_POST_FAILED', 'The payroll record could not be posted.', 500);
  }
}
