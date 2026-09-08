import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { changePartnerVendorStatus, PartnerVendorError } from '@/services/partnerVendorService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL')
    return failure('HOTEL_PARTNER_REQUIRED', 'A hotel partner account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only a supplier administrator can change vendor status.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_VENDOR_ACTION', 'Enter valid vendor action details.', 400);
  try {
    const event = await changePartnerVendorStatus({
      actorUserId: access.userId,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      partnerId: access.partnerId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: `HOTEL_VENDOR_${event.action}`,
      entityId: event.vendorId,
      entityType: 'HOTEL_VENDOR',
      summary: `Vendor ${event.toStatus.toLowerCase()} with a recorded reason.`,
    });
    return Response.json({ data: { id: event.id } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerVendorError
      ? failure(error.code, error.message, 409)
      : failure('VENDOR_STATUS_FAILED', 'The vendor status could not be changed.', 500);
  }
}
