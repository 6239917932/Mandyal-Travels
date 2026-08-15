import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { normalizeFinanceNote } from '@/services/adminFinanceService';

type RouteContext = { params: Promise<{ signalId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator)
    return NextResponse.json(
      { error: 'Platform administrator access is required.' },
      { status: 403 },
    );
  const body = await readJsonObject(request, 4096);
  const action = body?.action === 'RESOLVE' || body?.action === 'DISMISS' ? body.action : null;
  const note = normalizeFinanceNote(body?.note);
  if (!action || note.length < 5)
    return NextResponse.json(
      { error: 'Choose an outcome and enter a review note.' },
      { status: 400 },
    );
  const { signalId } = await context.params;
  try {
    const signal = await prisma.riskSignal.updateMany({
      data: {
        resolutionNote: note,
        reviewedAt: new Date(),
        reviewedByUserId: administrator.id,
        status: action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED',
      },
      where: { id: signalId, status: 'OPEN' },
    });
    if (signal.count !== 1)
      return NextResponse.json({ error: 'Only open signals can be reviewed.' }, { status: 409 });
    return NextResponse.json({ data: { id: signalId } });
  } catch (error) {
    console.error('Risk signal review failed.', error);
    return NextResponse.json({ error: 'The risk signal could not be reviewed.' }, { status: 500 });
  }
}
