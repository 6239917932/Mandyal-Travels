import { NextResponse } from 'next/server';

import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

type MemberRouteContext = { params: Promise<{ membershipId: string }> };

export async function DELETE(_request: Request, { params }: MemberRouteContext) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
  }

  const { membershipId } = await params;
  const member = await prisma.organizationMember.findFirst({
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
    where: {
      id: membershipId,
      organizationId: access.membership.organizationId,
      role: 'TRAVELLER',
    },
  });
  if (!member) {
    return NextResponse.json({ error: 'The traveller membership was not found.' }, { status: 404 });
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.organizationMember.delete({ where: { id: member.id } });
    await transaction.businessAuditLog.create({
      data: createBusinessAuditData({
        action: BUSINESS_AUDIT_ACTIONS.MEMBER_REMOVED,
        actorUserId: access.user.id,
        entityId: member.id,
        entityType: 'MEMBERSHIP',
        metadata: { memberEmail: member.user.email, role: member.role },
        organizationId: access.membership.organizationId,
        summary: `${member.user.firstName} ${member.user.lastName} removed from company travellers.`,
      }),
    });
  });
  return NextResponse.json({ data: { id: member.id } });
}
