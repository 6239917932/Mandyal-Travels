import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

type RouteContext = { params: Promise<{ caseId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request);
  if (!body || body.action !== 'CLOSE') {
    return NextResponse.json({ error: 'Choose a valid support case action.' }, { status: 400 });
  }

  const { caseId } = await context.params;
  try {
    const supportCase = await prisma.$transaction(async (transaction) => {
      const current = await transaction.businessSupportCase.findFirst({
        where: { id: caseId, organizationId: access.membership.organizationId },
      });
      if (!current) return null;
      if (current.status === 'CLOSED') return current;

      const updated = await transaction.businessSupportCase.update({
        data: { status: 'CLOSED' },
        where: { id: current.id },
      });
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: BUSINESS_AUDIT_ACTIONS.SUPPORT_CASE_CLOSED,
          actorUserId: access.user.id,
          entityId: updated.id,
          entityType: 'SUPPORT_CASE',
          metadata: { caseNumber: updated.caseNumber },
          organizationId: access.membership.organizationId,
          summary: `Support case ${updated.caseNumber} closed.`,
        }),
      });
      return updated;
    });

    if (!supportCase) {
      return NextResponse.json({ error: 'The support case was not found.' }, { status: 404 });
    }
    return NextResponse.json({ data: { id: supportCase.id, status: supportCase.status } });
  } catch (error) {
    console.error('Business support case update failed.', error);
    return NextResponse.json({ error: 'The support case could not be updated.' }, { status: 500 });
  }
}
