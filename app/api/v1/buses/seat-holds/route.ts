import { NextResponse } from 'next/server';

import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { getCurrentUser } from '@/lib/auth/session';
import { parseBusSeats } from '@/lib/bus/bookingRules';
import { BusSeatHoldError, busSeatHoldService } from '@/services/busSeatHoldService';

const HOLD_MUTATION_LIMIT = 30;
const HOLD_MUTATION_WINDOW_MS = 15 * 60 * 1000;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function readText(value: unknown, maximum: number): string | undefined {
  return typeof value === 'string' && value.trim().length <= maximum ? value.trim() : undefined;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

async function authorizeMutation(request: Request, userId: string) {
  if (!isSameOriginMutation(request)) {
    return errorResponse('CROSS_ORIGIN_REQUEST', 'Refresh the page and try again.', 403);
  }
  const rateLimit = await consumeRateLimit({
    action: 'BUS_SEAT_HOLD_MUTATION',
    identifier: getRequestRateLimitIdentifier(request, userId),
    limit: HOLD_MUTATION_LIMIT,
    windowMs: HOLD_MUTATION_WINDOW_MS,
  });
  return rateLimit.allowed
    ? null
    : errorResponse(
        'BUS_SEAT_HOLD_RATE_LIMITED',
        'Too many seat changes. Please wait before trying again.',
        429,
      );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return errorResponse('AUTH_REQUIRED', 'Sign in before holding bus seats.', 401);
  const denied = await authorizeMutation(request, user.id);
  if (denied) return denied;

  const body = await readJsonObject(request);
  const offerId = readText(body?.offerId, 200);
  const serviceDate = readText(body?.serviceDate, 10);
  const requestedSeats = Array.isArray(body?.seats) ? body.seats : [];
  const seats = parseBusSeats(requestedSeats.join(','), requestedSeats.length);
  if (!offerId || !serviceDate || !isIsoDate(serviceDate) || !seats) {
    return errorResponse(
      'INVALID_BUS_SEAT_HOLD',
      'Choose valid seats for an available direct operator trip.',
      400,
    );
  }

  try {
    const hold = await busSeatHoldService.create({
      offerId,
      seats,
      serviceDate,
      userId: user.id,
    });
    return NextResponse.json(
      { data: hold },
      { headers: { 'Cache-Control': 'no-store' }, status: 201 },
    );
  } catch (error) {
    if (error instanceof BusSeatHoldError) {
      return errorResponse(error.code, error.message, error.status);
    }
    console.error('Bus seat hold creation failed.', error);
    return errorResponse(
      'BUS_SEAT_HOLD_FAILED',
      'The seats could not be held. Please try again.',
      503,
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return errorResponse('AUTH_REQUIRED', 'Sign in before releasing bus seats.', 401);
  const denied = await authorizeMutation(request, user.id);
  if (denied) return denied;

  const body = await readJsonObject(request);
  const holdId = readText(body?.holdId, 120);
  if (!holdId) return errorResponse('INVALID_BUS_SEAT_HOLD', 'A valid seat hold is required.', 400);

  try {
    await busSeatHoldService.release({ holdId, userId: user.id });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Bus seat hold release failed.', error);
    return errorResponse(
      'BUS_SEAT_RELEASE_FAILED',
      'The seat hold could not be released. It will expire automatically.',
      503,
    );
  }
}
