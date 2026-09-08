import { NextResponse } from 'next/server';

import { isSameOriginMutation } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import { isPartnerAdministrator, PARTNER_ACCESS_ACTIONS } from '@/services/partnerAccessService';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Use the Mandyal Travels partner portal.' }, { status: 403 });
  }
  const access = await getPartnerAccess();
  if (!isPartnerAdministrator(access))
    return NextResponse.json(
      { error: 'Supplier administrator access is required.' },
      { status: 403 },
    );
  try {
    const { invitationId } = await params;
    const invitation = await prisma.partnerMemberInvitation.findFirst({
      where: { id: invitationId, partnerId: access.partnerId, status: 'PENDING' },
    });
    if (!invitation)
      return NextResponse.json(
        { error: 'The pending supplier invitation was not found.' },
        { status: 404 },
      );
    await prisma.$transaction(async (transaction) => {
      await transaction.partnerMemberInvitation.update({
        data: { status: 'REVOKED' },
        where: { id: invitation.id },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: PARTNER_ACCESS_ACTIONS.INVITATION_REVOKED,
          actorUserId: access.userId,
          entityId: invitation.id,
          entityType: 'MEMBERSHIP_INVITATION',
          metadataJson: JSON.stringify({ email: invitation.email, role: invitation.role }),
          partnerId: access.partnerId,
          summary: `Supplier team invitation revoked for ${invitation.email}.`,
        },
      });
    });
    return NextResponse.json({ data: { id: invitation.id } });
  } catch (error) {
    console.error('Partner member invitation revocation failed.', error);
    return NextResponse.json(
      { error: 'The supplier invitation could not be revoked.' },
      { status: 500 },
    );
  }
}
