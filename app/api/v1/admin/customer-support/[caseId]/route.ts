import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ caseId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return NextResponse.json(
      { error: 'Platform administrator access is required.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request, 2048);
  const action = body?.action === 'CLOSE' || body?.action === 'REOPEN' ? body.action : null;
  const resolutionNote = typeof body?.resolutionNote === 'string' ? body.resolutionNote.trim() : '';
  if (!action) {
    return NextResponse.json({ error: 'Choose a valid support case action.' }, { status: 400 });
  }
  if (action === 'CLOSE' && (resolutionNote.length < 5 || resolutionNote.length > 500)) {
    return NextResponse.json(
      { error: 'Enter a resolution note between 5 and 500 characters.' },
      { status: 400 },
    );
  }

  const { caseId } = await context.params;
  const targetStatus = action === 'CLOSE' ? 'CLOSED' : 'OPEN';

  try {
    const supportCase = await prisma.$transaction(async (transaction) => {
      const current = await transaction.customerSupportCase.findUnique({ where: { id: caseId } });
      if (!current) return null;
      if (current.status === targetStatus) return current;

      const updated = await transaction.customerSupportCase.update({
        data: {
          closedAt: action === 'CLOSE' ? new Date() : null,
          resolutionNote: action === 'CLOSE' ? resolutionNote : null,
          reviewedByUserId: administrator.id,
          status: targetStatus,
        },
        where: { id: current.id },
      });
      await transaction.customerSupportCaseEvent.create({
        data: {
          action: action === 'CLOSE' ? 'CLOSED' : 'REOPENED',
          actorUserId: administrator.id,
          caseId: updated.id,
          summary:
            action === 'CLOSE'
              ? `Case closed by Mandyal operations: ${resolutionNote}`
              : 'Case reopened by Mandyal operations.',
        },
      });
      return updated;
    });

    if (!supportCase) {
      return NextResponse.json({ error: 'The support case was not found.' }, { status: 404 });
    }
    return NextResponse.json({ data: { id: supportCase.id, status: supportCase.status } });
  } catch (error) {
    console.error('Platform customer support update failed.', error);
    return NextResponse.json({ error: 'The support case could not be updated.' }, { status: 500 });
  }
}
