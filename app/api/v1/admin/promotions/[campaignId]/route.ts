import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return NextResponse.json(
      { error: 'Platform administrator access is required.' },
      { status: 403 },
    );
  }
  const body = await readJsonObject(request, 2048);
  if (typeof body?.active !== 'boolean') {
    return NextResponse.json({ error: 'Choose an active or paused state.' }, { status: 400 });
  }
  const { campaignId } = await context.params;
  try {
    const campaign = await prisma.promotionCampaign.update({
      data: {
        active: body.active,
        updatedByUserId: administrator.id,
        version: { increment: 1 },
      },
      where: { id: campaignId },
    });
    return NextResponse.json({ data: { active: campaign.active, id: campaign.id } });
  } catch (error) {
    console.error('Promotion campaign update failed.', error);
    return NextResponse.json(
      { error: 'The campaign was not found or could not be updated.' },
      { status: 404 },
    );
  }
}
