import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { HotelBookingRuleError, hotelBookingService } from '@/services/hotelBookingService';
import type { ApiErrorResponse } from '@/types/commerce';

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
}

export async function GET(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access) {
    return errorResponse('PARTNER_UNAUTHORIZED', 'Partner access is required.', 401);
  }
  const url = new URL(request.url);
  const checkInDate = url.searchParams.get('checkInDate') ?? '';
  const checkOutDate = url.searchParams.get('checkOutDate') ?? '';
  try {
    return Response.json({
      data: await hotelBookingService.getPartnerInventory(
        checkInDate,
        checkOutDate,
        access.allowedHotelSlugs,
      ),
    });
  } catch (error) {
    return error instanceof HotelBookingRuleError
      ? errorResponse(error.code, error.message, 409)
      : errorResponse('INVENTORY_LOOKUP_FAILED', 'Inventory could not be loaded.', 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access) {
    return errorResponse('PARTNER_UNAUTHORIZED', 'Partner access is required.', 401);
  }
  const body = await readJsonObject(request);
  if (!body) {
    return errorResponse('INVALID_JSON', 'The request body must contain valid JSON.', 400);
  }
  const values = body;
  if (
    typeof values.roomTypeId !== 'string' ||
    typeof values.checkInDate !== 'string' ||
    typeof values.checkOutDate !== 'string' ||
    typeof values.availableRooms !== 'number' ||
    typeof values.note !== 'string' ||
    values.note.trim().length < 3 ||
    values.note.trim().length > 200
  ) {
    return errorResponse(
      'INVALID_INVENTORY_OVERRIDE',
      'A room, valid limit, dates, and short note are required.',
      400,
    );
  }
  try {
    const data = await hotelBookingService.setPartnerInventoryOverride(
      {
        availableRooms: values.availableRooms,
        checkInDate: values.checkInDate,
        checkOutDate: values.checkOutDate,
        note: values.note.trim(),
        roomTypeId: values.roomTypeId,
      },
      access.allowedHotelSlugs,
    );
    await recordPartnerAudit(access, {
      action: 'INVENTORY_OVERRIDE_UPDATED',
      entityId: values.roomTypeId,
      entityType: 'ROOM_TYPE',
      metadata: {
        availableRooms: values.availableRooms,
        checkInDate: values.checkInDate,
        checkOutDate: values.checkOutDate,
      },
      summary: 'Room inventory limit updated.',
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return error instanceof HotelBookingRuleError
      ? errorResponse(error.code, error.message, 409)
      : errorResponse('INVENTORY_OVERRIDE_FAILED', 'The inventory limit could not be saved.', 500);
  }
}
