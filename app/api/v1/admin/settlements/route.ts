import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import {
  PartnerSettlementError,
  partnerSettlementService,
} from '@/services/partnerSettlementService';

export async function POST(request: Request): Promise<Response> {
  const admin = await getPlatformAdmin();
  if (!admin)
    return Response.json(
      { error: { code: 'ADMIN_UNAUTHORIZED', message: 'Administrator access is required.' } },
      { status: 401 },
    );
  const body = await readJsonObject(request);
  if (
    !body ||
    typeof body.partnerId !== 'string' ||
    typeof body.periodStart !== 'string' ||
    typeof body.periodEnd !== 'string'
  )
    return Response.json(
      {
        error: {
          code: 'INVALID_SETTLEMENT',
          message: 'Supplier and settlement period are required.',
        },
      },
      { status: 400 },
    );
  try {
    return Response.json(
      {
        data: await partnerSettlementService.create(
          body.partnerId,
          body.periodStart,
          body.periodEnd,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return error instanceof PartnerSettlementError
      ? Response.json({ error: { code: error.code, message: error.message } }, { status: 409 })
      : Response.json(
          {
            error: {
              code: 'SETTLEMENT_FAILED',
              message: 'The settlement could not be calculated.',
            },
          },
          { status: 500 },
        );
  }
}
