import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function POST(request: Request, context: { params: Promise<{ propertyId: string }> }) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL')
    return failure('HOTEL_PARTNER_REQUIRED', 'An active hotel supplier account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only the supplier administrator can add room types.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid room and rate details.', 400);
  try {
    const { propertyId } = await context.params;
    const data = await partnerOperationsService.createRoomType(access.partnerId, propertyId, {
      amenities: String(body.amenities ?? '')
        .split(',')
        .map((value) => value.trim()),
      bedDescription: String(body.bedDescription ?? ''),
      cancellationDescription: String(body.cancellationDescription ?? ''),
      description: String(body.description ?? ''),
      freeCancellationHours: Number(body.freeCancellationHours),
      imageUrl: String(body.imageUrl ?? ''),
      inventoryCount: Number(body.inventoryCount),
      maximumAdults: Number(body.maximumAdults),
      maximumChildren: Number(body.maximumChildren),
      maximumGuests: Number(body.maximumGuests),
      mealPlan: String(body.mealPlan ?? ''),
      name: String(body.name ?? ''),
      nightlyRate: Number(body.nightlyRate),
      ratePlanName: String(body.ratePlanName ?? ''),
      refundable: body.refundable === true,
      taxesAndFees: Number(body.taxesAndFees),
    });
    await recordPartnerAudit(access, {
      action: 'ROOM_TYPE_CREATED',
      entityId: data.id,
      entityType: 'ROOM_TYPE',
      metadata: { propertyId },
      summary: `${data.name} added with ${data.inventoryCount} rooms; property published.`,
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('ROOM_CREATE_FAILED', 'The room type could not be added.', 500);
  }
}
