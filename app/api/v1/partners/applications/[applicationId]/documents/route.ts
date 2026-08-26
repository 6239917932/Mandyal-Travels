import { getCurrentUser } from '@/lib/auth/session';
import {
  getApplicantKycChecklist,
  PartnerKycGovernanceError,
} from '@/services/partnerKycGovernanceService';

type Context = { params: Promise<{ applicationId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in is required.' }, { status: 401 });
  try {
    const { applicationId } = await params;
    return Response.json({ data: await getApplicantKycChecklist(applicationId, user.id) });
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
