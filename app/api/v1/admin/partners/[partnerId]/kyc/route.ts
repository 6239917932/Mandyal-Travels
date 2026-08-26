import { getPlatformAdmin } from '@/lib/adminAuth';
import {
  getAdminPartnerKycChecklist,
  PartnerKycGovernanceError,
} from '@/services/partnerKycGovernanceService';

type Context = { params: Promise<{ partnerId: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!(await getPlatformAdmin()))
    return Response.json({ error: 'Platform administrator access is required.' }, { status: 403 });
  try {
    const { partnerId } = await params;
    return Response.json({ data: await getAdminPartnerKycChecklist(partnerId) });
  } catch (error) {
    const status = error instanceof PartnerKycGovernanceError ? error.status : 500;
    return Response.json(
      {
        error:
          status === 500
            ? 'The KYC record is temporarily unavailable.'
            : error instanceof Error
              ? error.message
              : 'Request failed.',
      },
      { status },
    );
  }
}
