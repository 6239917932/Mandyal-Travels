import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { normalizePromotionProducts } from '@/services/promotionService';

function integer(value: unknown, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export async function POST(request: Request) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return NextResponse.json(
      { error: 'Platform administrator access is required.' },
      { status: 403 },
    );
  }
  const body = await readJsonObject(request, 8192);
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const description =
    typeof body?.description === 'string' ? body.description.trim().slice(0, 500) : '';
  const products = normalizePromotionProducts(body?.products);
  const percentOff = integer(body?.percentOff, 1, 100);
  const maximumDiscount = integer(body?.maximumDiscount, 1, 10_000_000);
  const minimumSubtotal = integer(body?.minimumSubtotal, 1, 100_000_000);
  const usageLimit = body?.usageLimit ? integer(body.usageLimit, 1, 10_000_000) : null;
  const startsAt =
    typeof body?.startsAt === 'string' ? new Date(body.startsAt) : new Date('invalid');
  const endsAt = typeof body?.endsAt === 'string' ? new Date(body.endsAt) : new Date('invalid');
  if (
    !/^[A-Z0-9_-]{3,30}$/.test(code) ||
    name.length < 3 ||
    products.length === 0 ||
    percentOff === null ||
    maximumDiscount === null ||
    minimumSubtotal === null ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt <= startsAt
  ) {
    return NextResponse.json(
      { error: 'Enter a valid bounded promotion campaign.' },
      { status: 400 },
    );
  }
  try {
    const campaign = await prisma.promotionCampaign.create({
      data: {
        code,
        createdByUserId: administrator.id,
        description,
        endsAt,
        maximumDiscount,
        minimumSubtotal,
        name,
        percentOff,
        productsJson: JSON.stringify(products),
        startsAt,
        updatedByUserId: administrator.id,
        usageLimit,
      },
    });
    return NextResponse.json({ data: { id: campaign.id } }, { status: 201 });
  } catch (error) {
    console.error('Promotion campaign creation failed.', error);
    return NextResponse.json(
      { error: 'The code already exists or could not be saved.' },
      { status: 409 },
    );
  }
}
