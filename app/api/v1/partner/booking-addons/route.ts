import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import {
  changePartnerBookingAddonStatus,
  createPartnerBookingAddon,
  PartnerBookingAddonError,
} from '@/services/partnerBookingAddonService';

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
    return failure('PARTNER_ADMIN_REQUIRED', 'A hotel partner administrator is required.', 403);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_ADDON', 'Enter valid package or add-on details.', 400);
  try {
    if (body.action === 'status') {
      const addon = await changePartnerBookingAddonStatus({
        actorUserId: access.userId,
        addonId: String(body.addonId ?? ''),
        expectedVersion: Number(body.expectedVersion),
        partnerId: access.partnerId,
        status: String(body.status ?? '').toUpperCase(),
      });
      return Response.json({ data: { id: addon.id, version: addon.version } });
    }
    const addon = await createPartnerBookingAddon({
      actorUserId: access.userId,
      partnerId: access.partnerId,
      propertyId: String(body.propertyId ?? ''),
      values: body,
    });
    return Response.json({ data: { id: addon.id, version: addon.version } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerBookingAddonError
      ? failure(error.code, error.message, 409)
      : failure('BOOKING_ADDON_FAILED', 'The package or add-on could not be saved.', 500);
  }
}
