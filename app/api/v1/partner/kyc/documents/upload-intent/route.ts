import { isSameOriginMutation } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { partnerKycStorageReadiness } from '@/lib/partner/kycPersistenceRules';

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.mode !== 'user-session' || access.memberRole !== 'ADMIN') {
    return Response.json(
      { error: 'Named partner administrator access is required.' },
      { status: 403 },
    );
  }
  const readiness = partnerKycStorageReadiness({
    signingApiKey: process.env.KYC_DOCUMENT_SIGNING_API_KEY,
    signingEndpoint: process.env.KYC_DOCUMENT_SIGNING_ENDPOINT,
  });
  return Response.json(
    {
      error: {
        code: readiness.code,
        message:
          'Private evidence storage and malware scanning are not activated. No document was stored.',
      },
    },
    { status: 503 },
  );
}
