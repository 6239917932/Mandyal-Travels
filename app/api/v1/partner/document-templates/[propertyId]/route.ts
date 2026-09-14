import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerOperationalDocumentError,
  updatePartnerOperationalDocumentProfile,
} from '@/services/partnerOperationalDocumentService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ propertyId: string }> },
) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') {
    return failure('HOTEL_PARTNER_REQUIRED', 'A hotel partner account is required.', 403);
  }
  if (access.memberRole !== 'ADMIN') {
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only a supplier administrator can change document settings.',
      403,
    );
  }
  const body = await readJsonObject(request);
  if (!body) {
    return failure('INVALID_DOCUMENT_PROFILE', 'Enter valid operational document settings.', 400);
  }
  try {
    const { propertyId } = await context.params;
    const property = await updatePartnerOperationalDocumentProfile({
      expectedVersion: body.expectedVersion,
      partnerId: access.partnerId,
      propertyId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: 'OPERATIONAL_DOCUMENT_PROFILE_UPDATED',
      entityId: property.id,
      entityType: 'PARTNER_PROPERTY',
      metadata: { template: property.documentTemplate, theme: property.documentTheme },
      summary: `${property.displayName} operational document presentation updated.`,
    });
    return Response.json({ data: property });
  } catch (error) {
    return error instanceof PartnerOperationalDocumentError
      ? failure(error.code, error.message, 409)
      : failure(
          'DOCUMENT_PROFILE_UPDATE_FAILED',
          'The operational document settings could not be saved.',
          500,
        );
  }
}
