import { NextResponse } from 'next/server';

import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { isPartnerAdministrator, PARTNER_ACCESS_ACTIONS } from '@/services/partnerAccessService';

type Context = { params: Promise<{ membershipId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Use the Mandyal Travels partner portal.' }, { status: 403 });
  }
  const access = await getPartnerAccess();
  if (!isPartnerAdministrator(access))
    return NextResponse.json(
      { error: 'Supplier administrator access is required.' },
      { status: 403 },
    );
  const body = await readJsonObject(request);
  const role = body?.role === 'ADMIN' ? 'ADMIN' : body?.role === 'OPERATOR' ? 'OPERATOR' : null;
  if (!role)
    return NextResponse.json(
      { error: 'Select administrator or operator access.' },
      { status: 400 },
    );
  const { membershipId } = await params;
  const member = await prisma.supplyPartnerMember.findFirst({
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
    where: { id: membershipId, partnerId: access.partnerId },
  });
  if (!member)
    return NextResponse.json({ error: 'The supplier member was not found.' }, { status: 404 });
  if (member.userId === access.userId)
    return NextResponse.json(
      { error: 'Ask another administrator to change your own access.' },
      { status: 409 },
    );
  if (member.role === role) return NextResponse.json({ data: { id: member.id, role } });
  try {
    const updated = await prisma.$transaction(
      async (transaction) => {
        const current = await transaction.supplyPartnerMember.findFirst({
          where: { id: member.id, partnerId: access.partnerId },
        });
        if (!current) throw new Error('MEMBERSHIP_CHANGED');
        if (current.role === 'ADMIN' && role === 'OPERATOR') {
          const count = await transaction.supplyPartnerMember.count({
            where: { partnerId: access.partnerId, role: 'ADMIN' },
          });
          if (count <= 1) throw new Error('LAST_ADMINISTRATOR');
        }
        const changedAt = new Date();
        const result = await transaction.supplyPartnerMember.update({
          data: { role },
          where: { id: current.id },
        });
        await transaction.user.update({
          data: {
            accessChangedAt: changedAt,
            accessVersion: { increment: 1 },
            role: role === 'ADMIN' ? 'PARTNER_ADMIN' : 'PARTNER_OPERATOR',
          },
          where: { id: current.userId },
        });
        await transaction.userSession.deleteMany({ where: { userId: current.userId } });
        await transaction.partnerAuditLog.create({
          data: {
            action: PARTNER_ACCESS_ACTIONS.MEMBER_ROLE_UPDATED,
            actorUserId: access.userId,
            entityId: current.id,
            entityType: 'MEMBERSHIP',
            metadataJson: JSON.stringify({
              email: member.user.email,
              previousRole: current.role,
              role,
            }),
            partnerId: access.partnerId,
            summary: `${member.user.firstName} ${member.user.lastName} changed from ${current.role.toLowerCase()} to ${role.toLowerCase()} access.`,
          },
        });
        return result;
      },
      { isolationLevel: 'Serializable' },
    );
    return NextResponse.json({ data: { id: updated.id, role: updated.role } });
  } catch (error) {
    if (error instanceof Error && error.message === 'LAST_ADMINISTRATOR')
      return NextResponse.json(
        { error: 'Promote another administrator before changing the final administrator.' },
        { status: 409 },
      );
    if (error instanceof Error && error.message === 'MEMBERSHIP_CHANGED')
      return NextResponse.json(
        { error: 'The member access changed while this request was processed.' },
        { status: 409 },
      );
    if (hasPrismaErrorCode(error, 'P2034'))
      return NextResponse.json(
        { error: 'Member access changed concurrently. Review the directory and try again.' },
        { status: 409 },
      );
    console.error('Partner member role update failed.', error);
    return NextResponse.json(
      { error: 'The supplier member role could not be updated.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Context) {
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
    const { membershipId } = await params;
    const member = await prisma.supplyPartnerMember.findFirst({
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      where: { id: membershipId, partnerId: access.partnerId, role: 'OPERATOR' },
    });
    if (!member)
      return NextResponse.json(
        { error: 'The supplier operator membership was not found.' },
        { status: 404 },
      );
    await prisma.$transaction(async (transaction) => {
      const changedAt = new Date();
      await transaction.supplyPartnerMember.delete({ where: { id: member.id } });
      await transaction.user.update({
        data: { accessChangedAt: changedAt, accessVersion: { increment: 1 }, role: 'CUSTOMER' },
        where: { id: member.userId },
      });
      await transaction.userSession.deleteMany({ where: { userId: member.userId } });
      await transaction.partnerAuditLog.create({
        data: {
          action: PARTNER_ACCESS_ACTIONS.MEMBER_REMOVED,
          actorUserId: access.userId,
          entityId: member.id,
          entityType: 'MEMBERSHIP',
          metadataJson: JSON.stringify({ email: member.user.email, role: member.role }),
          partnerId: access.partnerId,
          summary: `${member.user.firstName} ${member.user.lastName} removed from the supplier workspace.`,
        },
      });
    });
    return NextResponse.json({ data: { id: member.id } });
  } catch (error) {
    console.error('Partner member removal failed.', error);
    return NextResponse.json(
      { error: 'The supplier member could not be removed.' },
      { status: 500 },
    );
  }
}
