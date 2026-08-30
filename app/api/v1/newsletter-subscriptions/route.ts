import { NextResponse } from 'next/server';

import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { prisma } from '@/lib/prisma';
import {
  normalizeNewsletterSubscription,
  PUBLIC_NEWSLETTER_BODY_LIMIT_BYTES,
} from '@/services/publicNewsletterRules';

const SUBSCRIPTION_LIMIT = 5;
const SUBSCRIPTION_WINDOW_MS = 24 * 60 * 60 * 1000;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return errorResponse(
      'FORBIDDEN_ORIGIN',
      'This request must originate from the Mandyal Travels portal.',
      403,
    );
  }

  const body = await readJsonObject(request, PUBLIC_NEWSLETTER_BODY_LIMIT_BYTES);
  if (!body) return errorResponse('INVALID_REQUEST', 'Enter a valid email address.', 400);

  const normalized = normalizeNewsletterSubscription(body);
  if (!normalized.ok) return errorResponse('INVALID_REQUEST', normalized.error, 400);

  const rateLimit = await consumeRateLimit({
    action: 'PUBLIC_NEWSLETTER_SUBSCRIBE',
    identifier: getRequestRateLimitIdentifier(request, normalized.data.email),
    limit: SUBSCRIPTION_LIMIT,
    windowMs: SUBSCRIPTION_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many subscription attempts were made. Please try again tomorrow.',
        },
      },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  }

  try {
    await prisma.newsletterSubscription.upsert({
      create: normalized.data,
      update: { consentAt: new Date(), source: 'FOOTER', status: 'ACTIVE' },
      where: { email: normalized.data.email },
    });
    return NextResponse.json({ data: { subscribed: true } }, { status: 201 });
  } catch (error) {
    console.error('Newsletter subscription failed.', error);
    return errorResponse(
      'NEWSLETTER_SUBSCRIPTION_FAILED',
      'We could not save your subscription. Please try again later.',
      500,
    );
  }
}
