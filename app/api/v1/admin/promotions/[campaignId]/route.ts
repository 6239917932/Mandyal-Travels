import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  normalizePromotionStatusUpdate,
  promotionActivationBlockReason,
} from '@/services/adminPromotionWorkbenchService';

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
  const update = body ? normalizePromotionStatusUpdate(body) : null;
  if (!update) {
    return NextResponse.json(
      { error: 'Choose a state and enter the current version plus a 10-500 character reason.' },
      { status: 400 },
    );
  }
  const { campaignId } = await context.params;
  try {
    const campaign = await prisma.$transaction(async (transaction) => {
      const current = await transaction.promotionCampaign.findUnique({
        where: { id: campaignId },
      });
      if (!current) throw new Error('NOT_FOUND');
      if (current.version !== update.expectedVersion) throw new Error('VERSION_CONFLICT');
      if (current.active === update.active) throw new Error('NO_CHANGE');
      if (update.active) {
        const blocked = promotionActivationBlockReason(current, new Date());
        if (blocked) throw new Error(`ACTIVATION_BLOCKED:${blocked}`);
      }
      const nextVersion = current.version + 1;
      const changed = await transaction.promotionCampaign.updateMany({
        data: {
          active: update.active,
          updatedByUserId: administrator.id,
          version: nextVersion,
        },
        where: { id: campaignId, version: current.version },
      });
      if (changed.count !== 1) throw new Error('VERSION_CONFLICT');
      await transaction.promotionCampaignEvent.create({
        data: {
          action: update.active ? 'ACTIVATED' : 'PAUSED',
          actorUserId: administrator.id,
          campaignId,
          fromActive: current.active,
          reason: update.reason,
          toActive: update.active,
          version: nextVersion,
        },
      });
      return transaction.promotionCampaign.findUniqueOrThrow({ where: { id: campaignId } });
    });
    return NextResponse.json({
      data: { active: campaign.active, id: campaign.id, version: campaign.version },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
      return NextResponse.json(
        { error: 'This campaign changed in another session. Refresh and review it again.' },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === 'NO_CHANGE') {
      return NextResponse.json(
        { error: 'The requested campaign state is already set.' },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.startsWith('ACTIVATION_BLOCKED:')) {
      return NextResponse.json(
        { error: error.message.slice('ACTIVATION_BLOCKED:'.length) },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'The campaign was not found.' }, { status: 404 });
    }
    console.error('Promotion campaign update failed.', error);
    return NextResponse.json({ error: 'The campaign could not be updated.' }, { status: 500 });
  }
}
