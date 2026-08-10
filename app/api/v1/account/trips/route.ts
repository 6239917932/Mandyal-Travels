import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

const PRODUCT_TYPES = new Set(['FLIGHT', 'BUS', 'CAR']);

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Sign in to save this trip.' } },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'The request body is invalid.' } },
      { status: 400 },
    );
  }

  const productType = isText(body.productType) ? body.productType.toUpperCase() : '';
  const confirmationCode = isText(body.confirmationCode) ? body.confirmationCode.trim() : '';
  const title = isText(body.title) ? body.title.trim() : '';
  const subtitle = isText(body.subtitle) ? body.subtitle.trim() : '';
  const startDate = isText(body.startDate) ? body.startDate.trim() : '';
  const endDate = body.endDate == null ? null : isText(body.endDate) ? body.endDate.trim() : '';
  const totalAmount = body.totalAmount;

  if (
    !PRODUCT_TYPES.has(productType) ||
    !confirmationCode ||
    !title ||
    !subtitle ||
    !startDate ||
    endDate === '' ||
    !Number.isInteger(totalAmount) ||
    (totalAmount as number) < 0
  ) {
    return NextResponse.json(
      { error: { code: 'INVALID_TRIP', message: 'The trip details are incomplete.' } },
      { status: 400 },
    );
  }

  const tripData = {
    userId: user.id,
    email: user.email,
    productType,
    status: isText(body.status) ? body.status.trim().toUpperCase() : 'CONFIRMED',
    title,
    subtitle,
    startDate,
    endDate,
    totalAmount: totalAmount as number,
    currency: 'INR',
    detailsJson: JSON.stringify(body.details ?? {}),
  };

  const trip = await prisma.customerTrip.upsert({
    where: { confirmationCode },
    create: { confirmationCode, ...tripData },
    update: tripData,
  });

  return NextResponse.json({ data: trip }, { status: 201 });
}
