import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { ChannelRuleError, normalizeExternalReference } from '@/lib/hotel/channelRules';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

function failure(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL' || access.memberRole !== 'ADMIN')
    return failure('PARTNER_UNAUTHORIZED', 'Hotel partner administrator access is required.', 401);
  if (access.mode !== 'integration-key' && !isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'This request must come from the Mandyal portal.', 403);
  const body = await readJsonObject(request);
  if (!body || typeof body.connectionId !== 'string' || typeof body.propertyId !== 'string')
    return failure('INVALID_MAPPING', 'Connection and property are required.', 400);
  const owned = await prisma.hotelChannelConnection.findFirst({
    where: { id: body.connectionId, partnerId: access.partnerId },
  });
  const property = await prisma.partnerProperty.findFirst({
    where: { id: body.propertyId, partnerId: access.partnerId, status: 'ACTIVE' },
  });
  if (!owned || !property)
    return failure(
      'MAPPING_SCOPE_VIOLATION',
      'The selected connection or property is outside your account.',
      403,
    );
  try {
    const externalPropertyRef = normalizeExternalReference(body.externalPropertyRef, 'Property');
    const mapping = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.hotelChannelPropertyMapping.upsert({
        create: { connectionId: owned.id, externalPropertyRef, propertyId: property.id },
        update: { externalPropertyRef, status: 'ACTIVE' },
        where: { connectionId_propertyId: { connectionId: owned.id, propertyId: property.id } },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'CHANNEL_PROPERTY_MAPPED',
          actorUserId: access.userId,
          entityId: saved.id,
          entityType: 'HOTEL_CHANNEL_MAPPING',
          partnerId: access.partnerId!,
          summary: `Mapped ${property.displayName} to an external property reference.`,
        },
      });
      return saved;
    });
    return Response.json({ data: mapping }, { status: 201 });
  } catch (error) {
    return error instanceof ChannelRuleError
      ? failure(error.code, error.message, 400)
      : failure('CHANNEL_MAPPING_FAILED', 'The property mapping could not be saved.', 409);
  }
}
