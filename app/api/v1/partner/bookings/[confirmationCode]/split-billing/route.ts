import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { HotelFolioRuleError } from '@/lib/pms/folio';
import { PartnerHotelFolioError } from '@/services/partnerHotelFolioService';
import {
  applyHotelFolioDiscount,
  postHotelSplitPayment,
} from '@/services/partnerSplitBillingService';

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
  if (
    !access?.partnerId ||
    !access.userId ||
    access.partnerType !== 'HOTEL' ||
    access.memberRole !== 'ADMIN'
  ) {
    return failure(
      'FINANCE_PERMISSION_REQUIRED',
      'A hotel partner administrator is required for split billing and discounts.',
      403,
    );
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_BILLING_ACTION', 'Enter valid billing details.', 400);
  const { confirmationCode } = await context.params;
  const common = {
    actorIsAdmin: true,
    actorUserId: access.userId,
    confirmationCode,
    expectedBalance: body.expectedBalance,
    idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
    partnerId: access.partnerId,
  };
  try {
    if (body.action === 'DISCOUNT') {
      const entry = await applyHotelFolioDiscount({
        ...common,
        amount: body.amount,
        reason: body.reason,
      });
      return Response.json({ data: { entryIds: [entry.id] } }, { status: 201 });
    }
    if (body.action === 'SPLIT_PAYMENT') {
      const entries = await postHotelSplitPayment({ ...common, allocations: body.allocations });
      return Response.json(
        { data: { entryIds: entries.map((entry) => entry.id) } },
        { status: 201 },
      );
    }
    return failure('INVALID_BILLING_ACTION', 'Choose discount or split payment.', 400);
  } catch (error) {
    if (error instanceof HotelFolioRuleError || error instanceof PartnerHotelFolioError) {
      return failure(error.code, error.message, 409);
    }
    return failure('SPLIT_BILLING_FAILED', 'The billing action could not be completed.', 500);
  }
}
