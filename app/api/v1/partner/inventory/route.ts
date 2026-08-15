import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { HotelBookingRuleError, hotelBookingService } from '@/services/hotelBookingService';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import { prisma } from '@/lib/prisma';
import type { ApiErrorResponse } from '@/types/commerce';

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
}

export async function GET(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL') {
    return errorResponse('PARTNER_UNAUTHORIZED', 'Partner access is required.', 401);
  }
  const url = new URL(request.url);
  const checkInDate = url.searchParams.get('checkInDate') ?? '';
  const checkOutDate = url.searchParams.get('checkOutDate') ?? '';
  try {
    const data = await hotelBookingService.getPartnerInventory(
      checkInDate,
      checkOutDate,
      access.allowedHotelSlugs,
    );
    const calendarDays = access.partnerId
      ? await prisma.partnerHotelInventoryDay.findMany({
          include: { property: { select: { displayName: true } } },
          orderBy: [{ stayDate: 'asc' }, { roomTypeId: 'asc' }],
          where: {
            property: { partnerId: access.partnerId, status: 'ACTIVE' },
            stayDate: { gte: checkInDate, lte: checkOutDate },
          },
        })
      : [];
    const roomTypes = calendarDays.length
      ? await prisma.partnerRoomType.findMany({
          select: { name: true, roomTypeId: true },
          where: { roomTypeId: { in: [...new Set(calendarDays.map((day) => day.roomTypeId))] } },
        })
      : [];
    const managedRooms = await prisma.partnerRoomType.findMany({
      include: { ratePlans: { orderBy: { createdAt: 'asc' }, where: { status: 'ACTIVE' } } },
      where: { property: { partnerId: access.partnerId, status: 'ACTIVE' }, status: 'ACTIVE' },
    });
    const ratePlanDays = await prisma.partnerRatePlanInventoryDay.findMany({
      include: { ratePlan: { include: { room: { include: { property: true } } } } },
      orderBy: [{ stayDate: 'asc' }, { ratePlanId: 'asc' }],
      where: {
        ratePlan: { room: { property: { partnerId: access.partnerId, status: 'ACTIVE' } } },
        stayDate: { gte: checkInDate, lte: checkOutDate },
      },
    });
    const roomNames = new Map(roomTypes.map((room) => [room.roomTypeId, room.name]));
    return Response.json({
      calendar: [
        ...calendarDays.map((day) => ({
          availableRooms: day.availableRooms,
          closedToArrival: day.closedToArrival,
          closedToDeparture: day.closedToDeparture,
          hotelName: day.property.displayName,
          maximumStayNights: day.maximumStayNights ?? undefined,
          minimumStayNights: day.minimumStayNights ?? undefined,
          nightlyRate: day.nightlyRate ?? undefined,
          note: day.note,
          roomName: roomNames.get(day.roomTypeId) ?? day.roomTypeId,
          roomTypeId: day.roomTypeId,
          stayDate: day.stayDate,
          stopSell: day.stopSell,
        })),
        ...ratePlanDays.map((day) => ({
          availableRooms: day.ratePlan.room.inventoryCount,
          closedToArrival: false,
          closedToDeparture: false,
          hotelName: day.ratePlan.room.property.displayName,
          nightlyRate: day.nightlyRate,
          note: day.note,
          ratePlanName: day.ratePlan.name,
          roomName: day.ratePlan.room.name,
          roomTypeId: day.ratePlan.room.roomTypeId,
          stayDate: day.stayDate,
          stopSell: false,
        })),
      ],
      data,
      ratePlans: managedRooms.flatMap((room) =>
        room.ratePlans.map((ratePlan) => ({
          id: ratePlan.id,
          name: ratePlan.name,
          roomTypeId: room.roomTypeId,
        })),
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
  if (!access?.partnerId || access.partnerType !== 'HOTEL') {
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
  const ratePlanRecordId =
    typeof values.ratePlanRecordId === 'string' && values.ratePlanRecordId.length > 0
      ? values.ratePlanRecordId
      : undefined;
  const minimumStayNights =
    typeof values.minimumStayNights === 'number' && values.minimumStayNights > 0
      ? values.minimumStayNights
      : undefined;
  const maximumStayNights =
    typeof values.maximumStayNights === 'number' && values.maximumStayNights > 0
      ? values.maximumStayNights
      : undefined;
  const closedToArrival = values.closedToArrival === true;
  const closedToDeparture = values.closedToDeparture === true;
  const clearNightlyRate = values.clearNightlyRate === true;
  if (clearNightlyRate && nightlyRate !== undefined) {
    return errorResponse(
      'CONFLICTING_RATE_ACTION',
      'Enter a seasonal price or clear the saved price, but do not select both.',
      400,
    );
  }
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
          closedToArrival,
          closedToDeparture,
          clearNightlyRate,
          endDate: checkOutDate,
          nightlyRate,
          maximumStayNights,
          minimumStayNights,
          note,
          partnerId: access.partnerId,
          propertyId: property.id,
          ratePlanRecordId,
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
        maximumStayNights,
        minimumStayNights,
        closedToArrival,
        closedToDeparture,
        clearNightlyRate,
        stopSell,
      },
      summary: 'Room inventory limit updated.',
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return error instanceof HotelBookingRuleError || error instanceof PartnerOperationsError
      ? errorResponse(error.code, error.message, 409)
      : errorResponse('INVENTORY_OVERRIDE_FAILED', 'The inventory limit could not be saved.', 500);
  }
}
