import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ propertyId: string }> },
) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL')
    return failure('HOTEL_PARTNER_REQUIRED', 'An active hotel supplier account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only the supplier administrator can publish properties.',
      403,
    );
  const body = await readJsonObject(request);
  const action = String(body?.action ?? '') as 'PAUSE' | 'PUBLISH' | 'UPDATE_LOCATION';
  if (!['PAUSE', 'PUBLISH', 'UPDATE_LOCATION'].includes(action))
    return failure('INVALID_ACTION', 'Choose a supported property update.', 400);
  try {
    const { propertyId } = await context.params;
    const data = action === 'UPDATE_LOCATION'
      ? await partnerOperationsService.updatePropertyLocation(access.partnerId, propertyId, {
          city: String(body?.city ?? ''),
          district: String(body?.district ?? ''),
          locality: String(body?.locality ?? ''),
          locationAliases: String(body?.locationAliases ?? '').split(',').map((value) => value.trim()),
          state: String(body?.state ?? ''),
          tehsil: String(body?.tehsil ?? ''),
        })
      : await partnerOperationsService.setPropertyPublication(access.partnerId, propertyId, action);
    await recordPartnerAudit(access, {
      action: action === 'PUBLISH' ? 'PROPERTY_PUBLISHED' : action === 'PAUSE' ? 'PROPERTY_PAUSED' : 'PROPERTY_LOCATION_UPDATED',
      entityId: data.id,
      entityType: 'PROPERTY',
      summary: action === 'UPDATE_LOCATION'
        ? `${data.displayName} search location updated.`
        : `${data.displayName} ${action === 'PUBLISH' ? 'published to hotel search' : 'paused from sale'}.`,
    });
    return Response.json({ data });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('PROPERTY_UPDATE_FAILED', 'The property status could not be updated.', 500);
  }
}
