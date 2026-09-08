import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { HotelFolioRuleError } from '@/lib/pms/folio';
import {
  PartnerHotelFolioError,
  postHotelFolioEntry,
  reverseHotelFolioEntry,
} from '@/services/partnerHotelFolioService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(
  request: Request,
  context: { params: Promise<{ confirmationCode: string }> },
) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') {
    return failure('HOTEL_PARTNER_REQUIRED', 'Hotel partner access is required.', 403);
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_FOLIO_ACTION', 'Enter valid folio details.', 400);
  const { confirmationCode } = await context.params;
  const idempotencyKey = request.headers.get('x-idempotency-key') ?? '';
  try {
    if (body.action === 'REVERSE') {
      if (access.memberRole !== 'ADMIN') {
        return failure(
          'FINANCE_PERMISSION_REQUIRED',
          'Only a partner administrator can reverse a folio posting.',
          403,
        );
      }
      const entry = await reverseHotelFolioEntry({
        actorUserId: access.userId,
        confirmationCode,
        entryId: String(body.entryId ?? ''),
        idempotencyKey,
        partnerId: access.partnerId,
        reason: body.reason,
      });
      return Response.json({ data: { id: entry.id } }, { status: 201 });
    }
    if (body.action !== 'POST') {
      return failure('INVALID_FOLIO_ACTION', 'Choose a valid folio action.', 400);
    }
    const entry = await postHotelFolioEntry({
      actorIsAdmin: access.memberRole === 'ADMIN',
      actorUserId: access.userId,
      confirmationCode,
      idempotencyKey,
      partnerId: access.partnerId,
      posting: {
        amount: body.amount,
        category: body.category,
        description: body.description,
        entryType: body.entryType,
      },
    });
    return Response.json({ data: { id: entry.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof HotelFolioRuleError || error instanceof PartnerHotelFolioError) {
      return failure(error.code, error.message, 409);
    }
    return failure('FOLIO_ACTION_FAILED', 'The folio action could not be completed.', 500);
  }
}
