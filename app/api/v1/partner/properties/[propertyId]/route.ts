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
  const action = String(body?.action ?? '') as 'PAUSE' | 'PUBLISH' | 'UPDATE_CONTENT' | 'UPDATE_LOCATION' | 'UPDATE_PROFILE';
  if (!['PAUSE', 'PUBLISH', 'UPDATE_CONTENT', 'UPDATE_LOCATION', 'UPDATE_PROFILE'].includes(action))
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
      : action === 'UPDATE_PROFILE'
        ? await partnerOperationsService.updatePropertyProfile(access.partnerId, propertyId, {
            checkInTime: String(body?.checkInTime ?? ''),
            checkOutTime: String(body?.checkOutTime ?? ''),
            contactEmail: String(body?.contactEmail ?? ''),
            contactPhone: String(body?.contactPhone ?? ''),
            description: String(body?.description ?? ''),
            displayName: String(body?.displayName ?? ''),
            minimumCheckInAge: Number(body?.minimumCheckInAge),
            propertyType: String(body?.propertyType ?? ''),
            starRating: Number(body?.starRating),
          })
        : action === 'UPDATE_CONTENT'
          ? await partnerOperationsService.updatePropertyContent(access.partnerId, propertyId, {
              amenities: String(body?.amenities ?? '').split(',').map((value) => value.trim()),
              childrenAllowed: body?.childrenAllowed === true,
              imageUrl: String(body?.imageUrl ?? ''),
              imageUrls: String(body?.imageUrls ?? '').split('\n').map((value) => value.trim()).filter(Boolean),
              languages: String(body?.languages ?? '').split(',').map((value) => value.trim()),
              landmarks: String(body?.landmarks ?? '').split('\n').map((value) => value.trim()),
              petsAllowed: body?.petsAllowed === true,
              policies: String(body?.policies ?? '').split('\n').map((value) => value.trim()),
              smokingAllowed: body?.smokingAllowed === true,
            })
        : await partnerOperationsService.setPropertyPublication(access.partnerId, propertyId, action);
    await recordPartnerAudit(access, {
      action: action === 'PUBLISH' ? 'PROPERTY_PUBLISHED' : action === 'PAUSE' ? 'PROPERTY_PAUSED' : action === 'UPDATE_PROFILE' ? 'PROPERTY_PROFILE_UPDATED' : action === 'UPDATE_CONTENT' ? 'PROPERTY_CONTENT_UPDATED' : 'PROPERTY_LOCATION_UPDATED',
      entityId: data.id,
      entityType: 'PROPERTY',
      summary: action === 'UPDATE_LOCATION'
        ? `${data.displayName} search location updated.`
        : action === 'UPDATE_PROFILE'
          ? `${data.displayName} public profile and operating details updated.`
          : action === 'UPDATE_CONTENT'
            ? `${data.displayName} amenities, policies, and media updated.`
        : `${data.displayName} ${action === 'PUBLISH' ? 'published to hotel search' : 'paused from sale'}.`,
    });
    return Response.json({ data });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('PROPERTY_UPDATE_FAILED', 'The property status could not be updated.', 500);
  }
}
