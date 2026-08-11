import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

type MemberRouteContext = { params: Promise<{ membershipId: string }> };

export async function PATCH(request: Request, { params }: MemberRouteContext) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: 'Enter a valid member role request.' }, { status: 400 });
  }
  const role = body.role === 'ADMIN' || body.role === 'TRAVELLER' ? body.role : null;
  if (!role) {
    return NextResponse.json(
      { error: 'Select administrator or traveller access.' },
      { status: 400 },
    );
  }

  const { membershipId } = await params;
  const member = await prisma.organizationMember.findFirst({
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
    where: { id: membershipId, organizationId: access.membership.organizationId },
  });
  if (!member) {
    return NextResponse.json({ error: 'The organization member was not found.' }, { status: 404 });
  }
  if (member.role === role) {
    return NextResponse.json({ data: { id: member.id, role: member.role } });
  }

  let updatedMember;
  try {
    updatedMember = await prisma.$transaction(async (transaction) => {
      const currentMember = await transaction.organizationMember.findFirst({
        where: { id: member.id, organizationId: access.membership.organizationId },
      });
      if (!currentMember) throw new Error('MEMBERSHIP_CHANGED');

      if (currentMember.role === 'ADMIN' && role === 'TRAVELLER') {
        const administratorCount = await transaction.organizationMember.count({
          where: { organizationId: access.membership.organizationId, role: 'ADMIN' },
        });
        if (administratorCount <= 1) throw new Error('LAST_ADMINISTRATOR');
      }

      const updated = await transaction.organizationMember.update({
        data: { role },
        where: { id: currentMember.id },
      });
      await transaction.user.update({
        data: { role: role === 'ADMIN' ? 'BUSINESS_ADMIN' : 'CUSTOMER' },
        where: { id: currentMember.userId },
      });
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: BUSINESS_AUDIT_ACTIONS.MEMBER_ROLE_UPDATED,
          actorUserId: access.user.id,
          entityId: currentMember.id,
          entityType: 'MEMBERSHIP',
          metadata: { memberEmail: member.user.email, previousRole: currentMember.role, role },
          organizationId: access.membership.organizationId,
          summary: `${member.user.firstName} ${member.user.lastName} changed from ${currentMember.role.toLowerCase()} to ${role.toLowerCase()}.`,
        }),
      });
      return updated;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'LAST_ADMINISTRATOR') {
      return NextResponse.json(
        { error: 'Promote another administrator before changing the final administrator.' },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === 'MEMBERSHIP_CHANGED') {
      return NextResponse.json(
        { error: 'The member access changed while this request was being processed.' },
        { status: 409 },
      );
    }
    throw error;
  }

  return NextResponse.json({ data: { id: updatedMember.id, role: updatedMember.role } });
}

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
