import { NextResponse } from 'next/server';

import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { rebuildHotelSearchProjections } from '@/services/searchProjectionService';

export async function GET() {
  if (!(await getPlatformAdmin()))
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  const grouped = await prisma.searchProjectionDocument.groupBy({
    by: ['entityType'],
    _count: { _all: true },
    _max: { projectedAt: true },
  });
  return NextResponse.json({ data: { projections: grouped } });
}

export async function POST() {
  if (!(await getPlatformAdmin()))
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  return NextResponse.json({ data: await rebuildHotelSearchProjections() });
}
