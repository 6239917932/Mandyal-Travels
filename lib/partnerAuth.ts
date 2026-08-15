import { timingSafeEqual } from 'node:crypto';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { readConfiguredSecret } from '@/lib/security/configuredSecret';

export type PartnerAccess = {
  allowedHotelSlugs?: string[];
  memberRole?: string;
  mode: 'integration-key' | 'user-session';
  partnerId?: string;
  partnerName?: string;
  partnerType?: string;
  userId?: string;
};

export function isValidPartnerKey(value: string | null): boolean {
  const expected = readConfiguredSecret('PARTNER_ADMIN_KEY');
  if (!expected || !value) return false;
  const suppliedBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

export async function getPartnerAccess(request?: Request): Promise<PartnerAccess | null> {
  if (request && isValidPartnerKey(request.headers.get('x-partner-key'))) {
    const partnerId = request.headers.get('x-partner-id')?.trim();
    if (!partnerId) return null;
    const partner = await prisma.supplyPartner.findFirst({
      include: {
        properties: {
          select: { hotelSlug: true },
          where: { status: 'ACTIVE' },
        },
      },
      where: { id: partnerId, status: 'ACTIVE' },
    });
    if (!partner) return null;
    return {
      allowedHotelSlugs: partner.properties.map((property) => property.hotelSlug),
      memberRole: 'ADMIN',
      mode: 'integration-key',
      partnerId: partner.id,
      partnerName: partner.name,
      partnerType: partner.type,
    };
  }

  const user = await getCurrentUser();
  if (!user || !['PARTNER_ADMIN', 'PARTNER_OPERATOR'].includes(user.role)) return null;
  const membership = await prisma.supplyPartnerMember.findUnique({
    include: {
      partner: {
        include: {
          properties: {
            select: { hotelSlug: true },
            where: { status: 'ACTIVE' },
          },
        },
      },
    },
    where: { userId: user.id },
  });
  if (!membership || membership.partner.status !== 'ACTIVE') return null;
  return {
    allowedHotelSlugs: membership.partner.properties.map((property) => property.hotelSlug),
    memberRole: membership.role,
    mode: 'user-session',
    partnerId: membership.partnerId,
    partnerName: membership.partner.name,
    partnerType: membership.partner.type,
    userId: user.id,
  };
}

export async function recordPartnerAudit(
  access: PartnerAccess,
  input: {
    action: string;
    entityId?: string;
    entityType: string;
    metadata?: Record<string, unknown>;
    summary: string;
  },
) {
  if (!access.partnerId) return;
  await prisma.partnerAuditLog.create({
    data: {
      action: input.action,
      actorUserId: access.userId,
      entityId: input.entityId,
      entityType: input.entityType,
      metadataJson: JSON.stringify(input.metadata ?? {}),
      partnerId: access.partnerId,
      summary: input.summary,
    },
  });
}
