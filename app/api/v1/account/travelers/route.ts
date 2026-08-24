import { NextResponse } from 'next/server';

import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  hasSavedTravelerCsrf,
  normalizeSavedTravelerInput,
  SAVED_TRAVELER_LIMIT,
} from '@/services/savedTravelerService';

const select = {
  dateOfBirth: true,
  email: true,
  firstName: true,
  gender: true,
  id: true,
  label: true,
  lastName: true,
  phone: true,
  relationship: true,
} as const;

const MUTATION_LIMIT = 30;
const MUTATION_WINDOW_MS = 60 * 60 * 1000;

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Sign in to view saved travelers.' }, { status: 401 });

  const travelers = await prisma.savedTraveler.findMany({
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    select,
    take: SAVED_TRAVELER_LIMIT,
    where: { userId: user.id },
  });
  return NextResponse.json(
    { data: travelers, limit: SAVED_TRAVELER_LIMIT },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to save a traveler.' }, { status: 401 });
  if (!isSameOriginMutation(request) || !hasSavedTravelerCsrf(request))
    return NextResponse.json({ error: 'Refresh the page and try again.' }, { status: 403 });

  const rateLimit = await consumeRateLimit({
    action: 'SAVED_TRAVELER_MUTATION',
    identifier: getRequestRateLimitIdentifier(request, user.id),
    limit: MUTATION_LIMIT,
    windowMs: MUTATION_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many traveler changes. Please wait before trying again.' },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  }

  const body = await readJsonObject(request);
  const input = body ? normalizeSavedTravelerInput(body) : null;
  if (!input)
    return NextResponse.json({ error: 'Enter valid, bounded traveler details.' }, { status: 400 });

  try {
    const traveler = await prisma.$transaction(
      async (transaction) => {
        const count = await transaction.savedTraveler.count({ where: { userId: user.id } });
        if (count >= SAVED_TRAVELER_LIMIT) return null;
        return transaction.savedTraveler.create({ data: { ...input, userId: user.id }, select });
      },
      { isolationLevel: 'Serializable' },
    );
    if (!traveler)
      return NextResponse.json(
        { error: `You can save up to ${SAVED_TRAVELER_LIMIT} travelers.` },
        { status: 409 },
      );
    return NextResponse.json({ data: traveler }, { status: 201 });
  } catch (error) {
    console.error('Saved traveler creation failed.', error);
    return NextResponse.json(
      { error: 'The traveler could not be saved. Please try again.' },
      { status: 503 },
    );
  }
}
