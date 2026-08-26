import { getCurrentUser } from '@/lib/auth/session';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import {
  isPartnerKycDocumentType,
  normalizePartnerKycMetadata,
  validatePartnerKycDocumentDates,
} from '@/lib/partner/kycDocumentRules';
import { partnerKycStorageReadiness } from '@/lib/partner/kycPersistenceRules';
import {
  getApplicantKycChecklist,
  PartnerKycGovernanceError,
} from '@/services/partnerKycGovernanceService';

type Context = { params: Promise<{ applicationId: string }> };

export async function POST(request: Request, { params }: Context) {
  if (!isSameOriginMutation(request))
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in is required.' }, { status: 401 });
  const body = await readJsonObject(request);
  if (!body || !isPartnerKycDocumentType(body.documentType)) {
    return Response.json({ error: 'Choose a valid evidence type.' }, { status: 400 });
  }
  const metadata = normalizePartnerKycMetadata({
    byteSize: body.byteSize,
    contentType: body.contentType,
    originalFilename: body.originalFilename,
    sha256: body.sha256,
  });
  const dates = validatePartnerKycDocumentDates({
    documentType: body.documentType,
    expiresOn: typeof body.expiresOn === 'string' ? body.expiresOn : null,
    issuedOn: typeof body.issuedOn === 'string' ? body.issuedOn : null,
    today: new Date().toISOString().slice(0, 10),
  });
  if (!metadata.ok || !dates.ok) {
    return Response.json(
      {
        error: [...(!metadata.ok ? metadata.errors : []), ...(!dates.ok ? dates.errors : [])].join(
          ' ',
        ),
      },
      { status: 422 },
    );
  }
  try {
    const { applicationId } = await params;
    await getApplicantKycChecklist(applicationId, user.id);
  } catch (error) {
    const status = error instanceof PartnerKycGovernanceError ? error.status : 500;
    return Response.json(
      { error: status === 404 ? 'Application not found.' : 'KYC access could not be verified.' },
      { status },
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
