import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { normalizePrivacyResolutionNote, privacyRequestTransition } from '@/lib/privacy/governance';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ requestId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return NextResponse.json(
      { error: 'Platform administrator access is required.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request, 2048);
  const action = typeof body?.action === 'string' ? body.action.toUpperCase() : '';
  const note = normalizePrivacyResolutionNote(body?.note);
  const version = typeof body?.version === 'number' ? body.version : Number.NaN;
  if (!note) {
    return NextResponse.json(
      { error: 'Enter a review note between 10 and 500 characters.' },
      { status: 400 },
    );
  }
  if (!Number.isSafeInteger(version) || version < 1) {
    return NextResponse.json(
      { error: 'The reviewed request version is invalid.' },
      { status: 400 },
    );
  }

  const { requestId } = await context.params;
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.dataPrivacyRequest.findUnique({ where: { id: requestId } });
      if (!current) return { kind: 'missing' as const };
      const targetStatus = privacyRequestTransition(current.status, action);
      if (!targetStatus) return { kind: 'transition' as const };
      if (current.version !== version) return { kind: 'conflict' as const };

      const updated = await transaction.dataPrivacyRequest.updateMany({
        data: {
          completedAt: targetStatus === 'COMPLETED' ? new Date() : null,
          resolutionNote: note,
          reviewedByUserId: administrator.id,
          status: targetStatus,
          version: { increment: 1 },
        },
        where: { id: current.id, status: current.status, version },
      });
      if (updated.count !== 1) return { kind: 'conflict' as const };
      await transaction.dataPrivacyRequestEvent.create({
        data: {
          action,
          actorUserId: administrator.id,
          fromStatus: current.status,
          note,
          requestId: current.id,
          toStatus: targetStatus,
          version: version + 1,
        },
      });
      return { kind: 'updated' as const, status: targetStatus, version: version + 1 };
    });

    if (result.kind === 'missing') {
      return NextResponse.json({ error: 'The privacy request was not found.' }, { status: 404 });
    }
    if (result.kind === 'transition') {
      return NextResponse.json(
        { error: 'That review action is not allowed from the current status.' },
        { status: 409 },
      );
    }
    if (result.kind === 'conflict') {
      return NextResponse.json(
        { error: 'This request changed after it was opened. Refresh and review it again.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Privacy request review failed.', error);
    return NextResponse.json(
      { error: 'The privacy request could not be updated.' },
      { status: 500 },
    );
  }
}
