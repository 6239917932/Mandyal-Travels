import { isValidPartnerKey } from '@/lib/partnerAuth';
import { HotelBookingRuleError, hotelBookingService } from '@/services/hotelBookingService';
import type { ApiErrorResponse } from '@/types/commerce';

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
}

export async function GET(request: Request): Promise<Response> {
  if (!isValidPartnerKey(request.headers.get('x-partner-key'))) {
    return errorResponse('PARTNER_UNAUTHORIZED', 'Partner access is required.', 401);
  }
  const url = new URL(request.url);
  const checkInDate = url.searchParams.get('checkInDate') ?? '';
  const checkOutDate = url.searchParams.get('checkOutDate') ?? '';
  try {
    return Response.json({
      data: await hotelBookingService.getPartnerInventory(checkInDate, checkOutDate),
    });
  } catch (error) {
    return error instanceof HotelBookingRuleError
      ? errorResponse(error.code, error.message, 409)
      : errorResponse('INVENTORY_LOOKUP_FAILED', 'Inventory could not be loaded.', 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isValidPartnerKey(request.headers.get('x-partner-key'))) {
    return errorResponse('PARTNER_UNAUTHORIZED', 'Partner access is required.', 401);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'The request body must contain valid JSON.', 400);
  }
  if (!body || typeof body !== 'object') {
    return errorResponse(
      'INVALID_INVENTORY_OVERRIDE',
      'Inventory override details are required.',
      400,
    );
  }
  const values = body as Record<string, unknown>;
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
    const data = await hotelBookingService.setPartnerInventoryOverride({
      availableRooms: values.availableRooms,
      checkInDate: values.checkInDate,
      checkOutDate: values.checkOutDate,
      note: values.note.trim(),
      roomTypeId: values.roomTypeId,
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return error instanceof HotelBookingRuleError
      ? errorResponse(error.code, error.message, 409)
      : errorResponse('INVENTORY_OVERRIDE_FAILED', 'The inventory limit could not be saved.', 500);
  }
}
