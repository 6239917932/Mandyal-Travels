import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { hotelService } from '@/services/hotelService';
import type { ApiErrorResponse } from '@/types/commerce';

type Context = { params: Promise<{ partnerId: string }> };
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
export async function PATCH(request: Request, { params }: Context) {
  const admin = await getPlatformAdmin();
  if (!admin) return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  const body = await readJsonObject(request);
  const { partnerId } = await params;
  if (body?.action !== 'ASSIGN_HOTEL' || typeof body.hotelSlug !== 'string')
    return failure('INVALID_ACTION', 'Choose a hotel to assign.', 400);
  const [partner, hotel] = await Promise.all([
    prisma.supplyPartner.findUnique({ where: { id: partnerId } }),
    hotelService.getHotelBySlug(body.hotelSlug),
  ]);
  if (!partner || partner.type !== 'HOTEL')
    return failure('HOTEL_PARTNER_NOT_FOUND', 'The hotel supplier was not found.', 404);
  if (!hotel) return failure('HOTEL_NOT_FOUND', 'The hotel inventory source was not found.', 404);
  try {
    const data = await prisma.$transaction(async (transaction) => {
      const property = await transaction.partnerProperty.create({
        data: {
          approvalStatus: 'APPROVED',
          displayName: hotel.name,
          hotelSlug: hotel.slug,
          partnerId,
          reviewedAt: new Date(),
          reviewedByUserId: admin.id,
        },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'PROPERTY_ASSIGNED',
          actorUserId: admin.id,
          entityId: property.id,
          entityType: 'PROPERTY',
          metadataJson: JSON.stringify({ hotelSlug: hotel.slug }),
          partnerId,
          summary: `${hotel.name} assigned to the supplier workspace.`,
        },
      });
      return property;
    });
    return Response.json({ data });
  } catch {
    return failure(
      'PROPERTY_ALREADY_ASSIGNED',
      'This hotel is already assigned to a supplier.',
      409,
    );
  }
}
