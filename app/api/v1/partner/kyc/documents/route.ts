import { getPartnerAccess } from '@/lib/partnerAuth';
import {
  getPartnerKycChecklist,
  PartnerKycGovernanceError,
} from '@/services/partnerKycGovernanceService';

export async function GET(request: Request) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.mode !== 'user-session')
    return Response.json({ error: 'Named partner access is required.' }, { status: 401 });
  try {
    return Response.json({ data: await getPartnerKycChecklist(access.partnerId) });
  } catch (error) {
    const status = error instanceof PartnerKycGovernanceError ? error.status : 500;
    return Response.json(
      {
        error:
          status === 500
            ? 'The KYC checklist is temporarily unavailable.'
            : error instanceof Error
              ? error.message
              : 'Request failed.',
      },
      { status },
    );
  }
}
