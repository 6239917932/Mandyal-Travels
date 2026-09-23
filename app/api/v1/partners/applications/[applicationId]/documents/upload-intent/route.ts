import { getCurrentUser } from '@/lib/auth/session';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import {
  isPartnerKycDocumentType,
  normalizePartnerKycMetadata,
  validatePartnerKycDocumentDates,
} from '@/lib/partner/kycDocumentRules';
import {
  createApplicantKycUploadIntent,
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
    const intent = await createApplicantKycUploadIntent({
      actorUserId: user.id,
      applicationId,
      documentType: body.documentType,
      expiresOn: dates.value.expiresOn,
      issuedOn: dates.value.issuedOn,
      metadata: metadata.value,
    });
    return Response.json({ data: intent }, { status: 201 });
  } catch (error) {
    const status = error instanceof PartnerKycGovernanceError ? error.status : 500;
    const code =
      error instanceof PartnerKycGovernanceError
        ? error.code
        : error instanceof Error && /^KYC_[A-Z_]+$/.test(error.message)
          ? error.message
          : 'KYC_UPLOAD_UNAVAILABLE';
    return Response.json(
      {
        error: {
          code,
          message:
            status === 404
              ? 'Application not found.'
              : 'Private evidence storage or malware scanning is unavailable. No document was stored.',
        },
      },
      { status: status === 500 ? 503 : status },
    );
  }
}
