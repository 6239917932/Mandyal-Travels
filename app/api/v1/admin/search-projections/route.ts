import { NextResponse } from 'next/server';

import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { normalizeAdminSearchProjectionRebuild } from '@/services/adminSearchProjectionRules';
import {
  getHotelSearchProjectionHealth,
  rebuildHotelSearchProjectionsInTransaction,
} from '@/services/searchProjectionService';

export async function GET() {
  if (!(await getPlatformAdmin()))
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  return NextResponse.json({ data: { health: await getHotelSearchProjectionHealth() } });
}

export async function POST(request: Request) {
  const administrator = await getPlatformAdmin();
  if (!administrator)
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  const raw: unknown = await request.json().catch(() => null);
  const input = normalizeAdminSearchProjectionRebuild(raw && typeof raw === 'object' ? raw : {});
  if (!input) {
    return NextResponse.json(
      { error: 'Provide a 10–500 character reason and the exact confirmation phrase.' },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const rebuilt = await rebuildHotelSearchProjectionsInTransaction(transaction);
      await transaction.searchProjectionRebuildEvent.create({
        data: {
          actorUserId: administrator.id,
          entityType: 'HOTEL',
          projectedCount: rebuilt.projected,
          reason: input.reason,
          removedCount: rebuilt.removed,
          sourceCount: rebuilt.sourceCount,
        },
      });
      return rebuilt;
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Search projection rebuild failed.', error);
    return NextResponse.json(
      { error: 'The search projection rebuild could not be completed.' },
      { status: 500 },
    );
  }
}
