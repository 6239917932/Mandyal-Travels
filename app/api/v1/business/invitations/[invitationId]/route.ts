import { NextResponse } from 'next/server';

import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

type InvitationRouteContext = { params: Promise<{ invitationId: string }> };

export async function DELETE(_request: Request, { params }: InvitationRouteContext) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
  }

  const { invitationId } = await params;
  const invitation = await prisma.organizationInvitation.findFirst({
    where: {
      id: invitationId,
      organizationId: access.membership.organizationId,
      status: 'PENDING',
    },
  });
  if (!invitation) {
    return NextResponse.json({ error: 'The pending invitation was not found.' }, { status: 404 });
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.organizationInvitation.update({
      data: { status: 'REVOKED' },
      where: { id: invitation.id },
    });
    await transaction.businessAuditLog.create({
      data: createBusinessAuditData({
        action: BUSINESS_AUDIT_ACTIONS.INVITATION_REVOKED,
        actorUserId: access.user.id,
        entityId: invitation.id,
        entityType: 'INVITATION',
        metadata: { email: invitation.email },
        organizationId: access.membership.organizationId,
        summary: `Traveller invitation revoked for ${invitation.email}.`,
      }),
    });
  });

  return NextResponse.json({ data: { id: invitation.id } });
}
