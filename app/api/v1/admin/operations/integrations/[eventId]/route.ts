import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ eventId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator)
    return NextResponse.json(
      { error: 'Platform administrator access is required.' },
      { status: 403 },
    );
  const body = await readJsonObject(request, 2048);
  const action = body?.action === 'RETRY' || body?.action === 'IGNORE' ? body.action : null;
  if (!action) return NextResponse.json({ error: 'Choose retry or ignore.' }, { status: 400 });
  const { eventId } = await context.params;
  try {
    const current = await prisma.integrationOutboxEvent.findUnique({ where: { id: eventId } });
    if (!current || current.status === 'DELIVERED' || current.status === 'PROCESSING') {
      return NextResponse.json(
        { error: 'This event cannot be changed in its current state.' },
        { status: 409 },
      );
    }
    const event = await prisma.integrationOutboxEvent.update({
      data:
        action === 'RETRY'
          ? { lastError: '', lockedAt: null, nextAttemptAt: new Date(), status: 'PENDING' }
          : { lockedAt: null, processedAt: new Date(), status: 'IGNORED' },
      where: { id: eventId },
    });
    return NextResponse.json({ data: { id: event.id, status: event.status } });
  } catch (error) {
    console.error('Integration queue action failed.', error);
    return NextResponse.json(
      { error: 'The integration event could not be updated.' },
      { status: 500 },
    );
  }
}
