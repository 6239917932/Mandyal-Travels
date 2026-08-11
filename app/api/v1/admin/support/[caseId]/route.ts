import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

type RouteContext = { params: Promise<{ caseId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return NextResponse.json(
      { error: 'Platform administrator access is required.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request, 1024);
  const action = body?.action === 'CLOSE' || body?.action === 'REOPEN' ? body.action : null;
  if (!action) {
    return NextResponse.json({ error: 'Choose a valid support case action.' }, { status: 400 });
  }

  const { caseId } = await context.params;
  const targetStatus = action === 'CLOSE' ? 'CLOSED' : 'OPEN';

  try {
    const supportCase = await prisma.$transaction(async (transaction) => {
      const current = await transaction.businessSupportCase.findUnique({ where: { id: caseId } });
      if (!current) return null;
      if (current.status === targetStatus) return current;

      const updated = await transaction.businessSupportCase.update({
        data: { status: targetStatus },
        where: { id: current.id },
      });
      const auditAction =
        action === 'CLOSE'
          ? BUSINESS_AUDIT_ACTIONS.SUPPORT_CASE_CLOSED
          : BUSINESS_AUDIT_ACTIONS.SUPPORT_CASE_REOPENED;
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: auditAction,
          actorUserId: administrator.id,
          entityId: updated.id,
          entityType: 'SUPPORT_CASE',
          metadata: {
            caseNumber: updated.caseNumber,
            previousStatus: current.status,
            status: updated.status,
          },
          organizationId: updated.organizationId,
          summary: `Support case ${updated.caseNumber} ${action === 'CLOSE' ? 'closed' : 'reopened'} by Mandyal operations.`,
        }),
      });
      return updated;
    });

    if (!supportCase) {
      return NextResponse.json({ error: 'The support case was not found.' }, { status: 404 });
    }
    return NextResponse.json({ data: { id: supportCase.id, status: supportCase.status } });
  } catch (error) {
    console.error('Platform support case update failed.', error);
    return NextResponse.json({ error: 'The support case could not be updated.' }, { status: 500 });
  }
}
