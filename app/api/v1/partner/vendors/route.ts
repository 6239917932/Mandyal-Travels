import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { createPartnerVendor, PartnerVendorError } from '@/services/partnerVendorService';

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
      'Only a supplier administrator can register vendors.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_VENDOR', 'Enter valid vendor details.', 400);
  try {
    const vendor = await createPartnerVendor({
      actorUserId: access.userId,
      partnerId: access.partnerId,
      propertyId: String(body.propertyId ?? ''),
      values: body,
    });
    await recordPartnerAudit(access, {
      action: 'HOTEL_VENDOR_REGISTERED',
      entityId: vendor.id,
      entityType: 'HOTEL_VENDOR',
      summary: `${vendor.vendorCode} vendor registered.`,
    });
    return Response.json({ data: { id: vendor.id, version: vendor.version } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerVendorError
      ? failure(error.code, error.message, 409)
      : failure('VENDOR_CREATE_FAILED', 'The vendor could not be registered.', 500);
  }
}
