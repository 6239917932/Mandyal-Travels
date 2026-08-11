import { NextResponse } from 'next/server';

import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';

const CABIN_CLASSES = new Set(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']);

export async function PATCH(request: Request) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const approvalRequired = body.approvalRequired;
  const defaultCabinClass = body.defaultCabinClass;
  const maximumTripAmount = body.maximumTripAmount;

  if (typeof approvalRequired !== 'boolean') {
    return NextResponse.json({ error: 'Select a valid approval setting.' }, { status: 400 });
  }
  if (typeof defaultCabinClass !== 'string' || !CABIN_CLASSES.has(defaultCabinClass)) {
    return NextResponse.json({ error: 'Select a valid default cabin.' }, { status: 400 });
  }
  if (
    maximumTripAmount !== null &&
    (typeof maximumTripAmount !== 'number' ||
      !Number.isInteger(maximumTripAmount) ||
      maximumTripAmount < 1000 ||
      maximumTripAmount > 10_000_000)
  ) {
    return NextResponse.json(
      { error: 'Maximum trip amount must be between â‚¹1,000 and â‚¹1,00,00,000.' },
      { status: 400 },
    );
  }

  const policy = await prisma.organization.update({
    data: { approvalRequired, defaultCabinClass, maximumTripAmount },
    select: { approvalRequired: true, defaultCabinClass: true, maximumTripAmount: true },
    where: { id: access.membership.organizationId },
  });

  return NextResponse.json({ data: policy });
}
