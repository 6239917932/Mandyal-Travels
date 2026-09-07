import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { HotelGuestRegistrationRuleError } from '@/lib/pms/guestRegistration';
import {
  PartnerGuestRegistrationError,
  registerHotelGuest,
} from '@/services/partnerGuestRegistrationService';
import type { ApiErrorResponse } from '@/types/commerce';

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ confirmationCode: string }> },
): Promise<Response> {
  if (!isSameOriginMutation(request)) {
    return errorResponse('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') {
    return errorResponse('PARTNER_UNAUTHORIZED', 'Hotel partner access is required.', 401);
  }
  const body = await readJsonObject(request);
  if (!body) return errorResponse('INVALID_REQUEST', 'Enter the guest registration details.', 400);
  const { confirmationCode } = await context.params;

  try {
    const registration = await registerHotelGuest({
      actorUserId: access.userId,
      confirmationCode,
      partnerId: access.partnerId,
      registration: {
        consentRecorded: body.consentRecorded === true,
        guestName: String(body.guestName ?? ''),
        identityLast4: String(body.identityLast4 ?? ''),
        identityType: String(body.identityType ?? ''),
        nationalityCountryCode: String(body.nationalityCountryCode ?? ''),
        residenceCity: String(body.residenceCity ?? ''),
      },
    });
    return Response.json({ data: registration }, { status: 201 });
  } catch (error) {
    if (error instanceof HotelGuestRegistrationRuleError) {
      return errorResponse(error.code, error.message, 400);
    }
    if (error instanceof PartnerGuestRegistrationError) {
      return errorResponse(
        error.code,
        error.message,
        error.code === 'INVALID_BOOKING_REFERENCE'
          ? 400
          : error.code === 'BOOKING_NOT_FOUND'
            ? 404
            : 409,
      );
    }
    return errorResponse(
      'GUEST_REGISTRATION_FAILED',
      'The guest reference could not be recorded.',
      500,
    );
  }
}
