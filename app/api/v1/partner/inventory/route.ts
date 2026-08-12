import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { HotelBookingRuleError, hotelBookingService } from '@/services/hotelBookingService';
import { partnerOperationsService } from '@/services/partnerOperationsService';
import { prisma } from '@/lib/prisma';
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
  const roomTypeId = values.roomTypeId;
  const checkInDate = values.checkInDate;
  const checkOutDate = values.checkOutDate;
  const availableRooms = values.availableRooms;
  const note = values.note.trim();
  const nightlyRate =
    typeof values.nightlyRate === 'number' && values.nightlyRate > 0
      ? values.nightlyRate
      : undefined;
  const stopSell = values.stopSell === true || availableRooms === 0;
  try {
    const data = await hotelBookingService.setPartnerInventoryOverride(
      {
        availableRooms,
        checkInDate,
        checkOutDate,
        note,
        roomTypeId,
      },
      access.allowedHotelSlugs,
    );
    if (access.partnerId) {
      const hotels = await Promise.all(
        (access.allowedHotelSlugs ?? []).map((slug) =>
          hotelBookingService
            .getPartnerInventory(checkInDate, checkOutDate, [slug])
            .then((rooms) => ({ rooms, slug })),
        ),
      );
      const assigned = hotels.find((hotel) =>
        hotel.rooms.some((room) => room.roomTypeId === roomTypeId),
      );
      const property = assigned
        ? await prisma.partnerProperty.findFirst({
            where: { hotelSlug: assigned.slug, partnerId: access.partnerId, status: 'ACTIVE' },
          })
        : null;
      if (property) {
        await partnerOperationsService.setHotelCalendar({
          availableRooms,
          endDate: checkOutDate,
          nightlyRate,
          note,
          partnerId: access.partnerId,
          propertyId: property.id,
          roomTypeId,
          startDate: checkInDate,
          stopSell,
        });
      }
    }
    await recordPartnerAudit(access, {
      action: 'INVENTORY_OVERRIDE_UPDATED',
      entityId: roomTypeId,
      entityType: 'ROOM_TYPE',
      metadata: {
        availableRooms,
        checkInDate,
        checkOutDate,
        nightlyRate,
        stopSell,
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
