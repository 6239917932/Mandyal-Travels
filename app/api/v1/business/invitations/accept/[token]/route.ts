import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';
import { hashBusinessInvitationToken } from '@/services/businessInvitationService';

type AcceptInvitationRouteContext = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: AcceptInvitationRouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in before accepting this invitation.' },
      { status: 401 },
    );
  }

  const { token } = await params;
  const invitation = await prisma.organizationInvitation.findUnique({
    include: { organization: { select: { name: true } } },
    where: { tokenHash: hashBusinessInvitationToken(token) },
  });
  if (!invitation) {
    return NextResponse.json({ error: 'This invitation is invalid.' }, { status: 404 });
  }
  if (invitation.status === 'ACCEPTED' && invitation.acceptedByUserId === user.id) {
    return NextResponse.json({ data: { organizationName: invitation.organization.name } });
  }
  if (invitation.status !== 'PENDING') {
    return NextResponse.json({ error: 'This invitation is no longer active.' }, { status: 409 });
  }
  if (invitation.expiresAt <= new Date()) {
    await prisma.organizationInvitation.updateMany({
      data: { status: 'EXPIRED' },
      where: { id: invitation.id, status: 'PENDING' },
    });
    return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
  }
  if (invitation.email !== user.email) {
    return NextResponse.json(
      { error: `Sign in with ${invitation.email} to accept this invitation.` },
      { status: 403 },
    );
  }

  const existingMembership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
  });
  if (existingMembership) {
    return NextResponse.json(
      { error: 'This account already belongs to an organization.' },
      { status: 409 },
    );
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const acceptedAt = new Date();
      const member = await transaction.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          role: invitation.role,
          userId: user.id,
        },
      });
      await transaction.organizationInvitation.update({
        data: { acceptedAt, acceptedByUserId: user.id, status: 'ACCEPTED' },
        where: { id: invitation.id },
      });
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: BUSINESS_AUDIT_ACTIONS.INVITATION_ACCEPTED,
          actorUserId: user.id,
          entityId: invitation.id,
          entityType: 'INVITATION',
          metadata: { email: user.email, membershipId: member.id, role: member.role },
          organizationId: invitation.organizationId,
          summary: `${user.firstName} ${user.lastName} accepted the company traveller invitation.`,
        }),
      });
    });
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) {
      return NextResponse.json(
        { error: 'This account already belongs to an organization.' },
        { status: 409 },
      );
    }
    console.error('Business invitation acceptance failed.', error);
    return NextResponse.json(
      { error: 'The invitation could not be accepted. Please try again.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { organizationName: invitation.organization.name } });
}