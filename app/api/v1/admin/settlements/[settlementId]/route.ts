import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import {
  PartnerSettlementError,
  partnerSettlementService,
} from '@/services/partnerSettlementService';
import { normalizeSettlementTransition } from '@/services/adminSettlementWorkbenchService';

type Context = { params: Promise<{ settlementId: string }> };
export async function PATCH(request: Request, context: Context): Promise<Response> {
  const admin = await getPlatformAdmin();
  if (!admin)
    return Response.json(
      { error: { code: 'ADMIN_UNAUTHORIZED', message: 'Administrator access is required.' } },
      { status: 401 },
    );
  const body = await readJsonObject(request, 2048);
  const transition = body ? normalizeSettlementTransition(body) : null;
  if (!transition)
    return Response.json(
      {
        error: {
          code: 'INVALID_ACTION',
          message: 'Choose an action and provide the current version plus a 10-500 character note.',
        },
      },
      { status: 400 },
    );
  const { settlementId } = await context.params;
  try {
    return Response.json({
      data: await partnerSettlementService.transition(
        settlementId,
        transition.action,
        admin.id,
        transition.note,
        transition.expectedVersion,
        transition.paymentReference,
      ),
    });
  } catch (error) {
    return error instanceof PartnerSettlementError
      ? Response.json({ error: { code: error.code, message: error.message } }, { status: 409 })
      : Response.json(
          {
            error: {
              code: 'SETTLEMENT_UPDATE_FAILED',
              message: 'The settlement could not be updated.',
            },
          },
          { status: 500 },
        );
  }
}
