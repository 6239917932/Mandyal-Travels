import { hotelBookingService, HotelBookingRuleError } from '@/services/hotelBookingService';
import type { ApiErrorResponse, HotelQuoteRequest } from '@/types/commerce';

function isHotelQuoteRequest(value: unknown): value is HotelQuoteRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const request = value as Record<string, unknown>;
  return (
    typeof request.adults === 'number' &&
    typeof request.checkInDate === 'string' &&
    typeof request.checkOutDate === 'string' &&
    typeof request.children === 'number' &&
    typeof request.hotelSlug === 'string' &&
    typeof request.ratePlanId === 'string' &&
    typeof request.rooms === 'number' &&
    typeof request.roomTypeId === 'string'
  );
}

function errorResponse(code: string, message: string, status: number): Response {
  const body: ApiErrorResponse = { error: { code, message } };
  return Response.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'The request body must contain valid JSON.', 400);
  }

  if (!isHotelQuoteRequest(body)) {
    return errorResponse('INVALID_QUOTE_REQUEST', 'Required quote fields are missing.', 400);
  }

  try {
    const quote = await hotelBookingService.createQuote(body);
    return Response.json({ data: quote }, { status: 201 });
  } catch (error) {
    if (error instanceof HotelBookingRuleError) {
      return errorResponse(error.code, error.message, 409);
    }

    return errorResponse('QUOTE_CREATION_FAILED', 'The quote could not be created.', 500);
  }
}
