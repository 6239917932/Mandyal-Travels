import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { NightAuditRuleError } from '@/lib/pms/nightAudit';
import {
  closePartnerOperationalDate,
  PartnerNightAuditError,
} from '@/services/partnerNightAuditService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (
    !access?.partnerId ||
    !access.userId ||
    access.partnerType !== 'HOTEL' ||
    access.memberRole !== 'ADMIN'
  ) {
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'A hotel partner administrator is required to close an operational date.',
      403,
    );
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_NIGHT_AUDIT', 'Enter valid night audit details.', 400);
  try {
    const closed = await closePartnerOperationalDate({
      actorUserId: access.userId,
      businessDate: body.businessDate,
      confirmation: body.confirmation,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      note: body.note,
      partnerId: access.partnerId,
      propertyId: String(body.propertyId ?? ''),
      version: Number(body.version),
    });
    return Response.json(
      {
        data: {
          businessDate: closed.businessDate,
          id: closed.id,
          nextBusinessDate: closed.nextBusinessDate,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof NightAuditRuleError || error instanceof PartnerNightAuditError) {
      return failure(error.code, error.message, 409);
    }
    return failure('NIGHT_AUDIT_FAILED', 'The operational date could not be closed.', 500);
  }
}
