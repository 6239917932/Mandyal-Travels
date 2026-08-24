import { NextResponse } from 'next/server';

import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { hasSavedTravelerCsrf, normalizeSavedTravelerInput } from '@/services/savedTravelerService';

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

type Context = { params: Promise<{ travelerId: string }> };

const MUTATION_LIMIT = 30;
const MUTATION_WINDOW_MS = 60 * 60 * 1000;

async function enforceMutationLimit(request: Request, userId: string) {
  return consumeRateLimit({
    action: 'SAVED_TRAVELER_MUTATION',
    identifier: getRequestRateLimitIdentifier(request, userId),
    limit: MUTATION_LIMIT,
    windowMs: MUTATION_WINDOW_MS,
  });
}

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many traveler changes. Please wait before trying again.' },
    { headers: { 'Retry-After': String(retryAfterSeconds) }, status: 429 },
  );
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to update a traveler.' }, { status: 401 });
  if (!isSameOriginMutation(request) || !hasSavedTravelerCsrf(request))
    return NextResponse.json({ error: 'Refresh the page and try again.' }, { status: 403 });

  const rateLimit = await enforceMutationLimit(request, user.id);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  const { travelerId } = await params;
  const body = await readJsonObject(request);
  const input = body ? normalizeSavedTravelerInput(body) : null;
  if (!travelerId || !input)
    return NextResponse.json({ error: 'Enter valid, bounded traveler details.' }, { status: 400 });

  try {
    const traveler = await prisma.$transaction(async (transaction) => {
      const result = await transaction.savedTraveler.updateMany({
        data: input,
        where: { id: travelerId, userId: user.id },
      });
      if (result.count !== 1) return null;
      return transaction.savedTraveler.findFirst({
        select,
        where: { id: travelerId, userId: user.id },
      });
    });
    if (!traveler)
      return NextResponse.json({ error: 'The saved traveler was not found.' }, { status: 404 });
    return NextResponse.json({ data: traveler });
  } catch (error) {
    console.error('Saved traveler update failed.', error);
    return NextResponse.json(
      { error: 'The traveler could not be updated. Please try again.' },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to delete a traveler.' }, { status: 401 });
  if (!isSameOriginMutation(request) || !hasSavedTravelerCsrf(request))
    return NextResponse.json({ error: 'Refresh the page and try again.' }, { status: 403 });

  const rateLimit = await enforceMutationLimit(request, user.id);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  const { travelerId } = await params;
  const result = await prisma.savedTraveler.deleteMany({
    where: { id: travelerId, userId: user.id },
  });
  if (result.count !== 1)
    return NextResponse.json({ error: 'The saved traveler was not found.' }, { status: 404 });
  return NextResponse.json({ data: { id: travelerId } });
}
