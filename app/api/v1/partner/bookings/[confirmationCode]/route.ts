import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

type StayStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW';

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
}

function readRoomAssignments(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ confirmationCode: string }> },
): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL') {
    return errorResponse('PARTNER_UNAUTHORIZED', 'Hotel partner access is required.', 401);
  }
  const { confirmationCode } = await context.params;
  try {
    const rooms = await partnerOperationsService.listAvailablePhysicalRooms(
      access.partnerId,
      confirmationCode,
    );
    return Response.json({ data: rooms });
  } catch (error) {
    if (error instanceof PartnerOperationsError) {
      return errorResponse(error.code, error.message, error.code === 'BOOKING_NOT_FOUND' ? 404 : 409);
    }
    return errorResponse('ROOM_AVAILABILITY_FAILED', 'Available physical rooms could not be loaded.', 500);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ confirmationCode: string }> },
): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL') {
    return errorResponse('PARTNER_UNAUTHORIZED', 'Hotel partner access is required.', 401);
  }
  const body = await readJsonObject(request);
  const { confirmationCode } = await context.params;
  if (body && typeof body.partnerNote === 'string') {
    try {
      const booking = await partnerOperationsService.updateHotelPartnerNote(
        access.partnerId,
        confirmationCode,
        body.partnerNote,
        access.userId,
      );
      return Response.json({ data: { partnerNote: booking.partnerNote } });
    } catch (error) {
      if (error instanceof PartnerOperationsError) {
        return errorResponse(error.code, error.message, error.code === 'BOOKING_NOT_FOUND' ? 404 : 409);
      }
      return errorResponse('BOOKING_NOTE_UPDATE_FAILED', 'The front-desk note could not be updated.', 500);
    }
  }
  const nextStatus = String(body?.status ?? '') as StayStatus;
  if (!['CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'].includes(nextStatus)) {
    return errorResponse('INVALID_STAY_STATUS', 'Choose a valid hotel stay status.', 400);
  }
  const assignedRoomNumbers = Array.isArray(body?.assignedRoomNumbers)
    ? body.assignedRoomNumbers.filter((value): value is string => typeof value === 'string')
    : [];
  try {
    const booking = await partnerOperationsService.updateHotelStayStatus(
      access.partnerId,
      confirmationCode,
      nextStatus,
      assignedRoomNumbers,
      access.userId,
    );
    return Response.json({
      data: {
        assignedRoomNumbers: readRoomAssignments(booking.assignedRoomNumbersJson),
        operationalStatus: booking.operationalStatus,
      },
    });
  } catch (error) {
    if (error instanceof PartnerOperationsError) {
      return errorResponse(error.code, error.message, error.code === 'BOOKING_NOT_FOUND' ? 404 : 409);
    }
    return errorResponse('STAY_UPDATE_FAILED', 'The hotel stay status could not be updated.', 500);
  }
}
