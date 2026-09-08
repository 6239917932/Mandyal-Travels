import { NextResponse } from 'next/server';

import { isSameOriginMutation } from '@/lib/api/request';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import {
  hashPartnerInvitationToken,
  PARTNER_ACCESS_ACTIONS,
} from '@/services/partnerAccessService';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Use the Mandyal Travels website.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: 'Sign in before accepting this invitation.' },
      { status: 401 },
    );
  const { token } = await params;
  const invitation = await prisma.partnerMemberInvitation.findUnique({
    include: { partner: { select: { name: true, status: true } } },
    where: { tokenHash: hashPartnerInvitationToken(token) },
  });
  if (!invitation)
    return NextResponse.json({ error: 'This supplier invitation is invalid.' }, { status: 404 });
  if (invitation.status === 'ACCEPTED' && invitation.acceptedByUserId === user.id)
    return NextResponse.json({ data: { partnerName: invitation.partner.name } });
  if (invitation.status !== 'PENDING')
    return NextResponse.json(
      { error: 'This supplier invitation is no longer active.' },
      { status: 409 },
    );
  if (invitation.expiresAt <= new Date()) {
    await prisma.partnerMemberInvitation.updateMany({
      data: { status: 'EXPIRED' },
      where: { id: invitation.id, status: 'PENDING' },
    });
    return NextResponse.json({ error: 'This supplier invitation has expired.' }, { status: 410 });
  }
  if (invitation.partner.status !== 'ACTIVE')
    return NextResponse.json({ error: 'This supplier workspace is not active.' }, { status: 409 });
  if (invitation.email !== user.email)
    return NextResponse.json(
      { error: `Sign in with ${invitation.email} to accept this invitation.` },
      { status: 403 },
    );
  const [partnerMembership, organizationMembership] = await Promise.all([
    prisma.supplyPartnerMember.findFirst({ where: { userId: user.id } }),
    prisma.organizationMember.findFirst({ where: { userId: user.id } }),
  ]);
  if (partnerMembership)
    return NextResponse.json(
      { error: 'This account already belongs to a supplier workspace.' },
      { status: 409 },
    );
  if (
    organizationMembership ||
    !['CUSTOMER', 'PARTNER_ADMIN', 'PARTNER_OPERATOR'].includes(user.role)
  )
    return NextResponse.json(
      { error: 'Use a dedicated supplier account to accept this invitation.' },
      { status: 409 },
    );

  try {
    await prisma.$transaction(
      async (transaction) => {
        const acceptedAt = new Date();
        const member = await transaction.supplyPartnerMember.create({
          data: { partnerId: invitation.partnerId, role: invitation.role, userId: user.id },
        });
        await transaction.partnerMemberInvitation.update({
          data: { acceptedAt, acceptedByUserId: user.id, status: 'ACCEPTED' },
          where: { id: invitation.id },
        });
        await transaction.user.update({
          data: {
            accessChangedAt: acceptedAt,
            accessVersion: { increment: 1 },
            role: invitation.role === 'ADMIN' ? 'PARTNER_ADMIN' : 'PARTNER_OPERATOR',
          },
          where: { id: user.id },
        });
        await transaction.partnerAuditLog.create({
          data: {
            action: PARTNER_ACCESS_ACTIONS.INVITATION_ACCEPTED,
            actorUserId: user.id,
            entityId: member.id,
            entityType: 'MEMBERSHIP',
            metadataJson: JSON.stringify({
              email: user.email,
              invitationId: invitation.id,
              role: invitation.role,
            }),
            partnerId: invitation.partnerId,
            summary: `${user.firstName} ${user.lastName} accepted supplier ${invitation.role.toLowerCase()} access.`,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002') || hasPrismaErrorCode(error, 'P2034'))
      return NextResponse.json(
        { error: 'Supplier access changed concurrently. Review the team directory and try again.' },
        { status: 409 },
      );
    console.error('Partner member invitation acceptance failed.', error);
    return NextResponse.json(
      { error: 'The supplier invitation could not be accepted.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ data: { partnerName: invitation.partner.name } });
}
