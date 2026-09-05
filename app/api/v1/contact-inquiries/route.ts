import { NextResponse } from 'next/server';

import { isTrustedPortalMutation } from '@/lib/api/portalOrigin';
import { readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { prisma } from '@/lib/prisma';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import {
  normalizePublicContactInquiry,
  PUBLIC_CONTACT_BODY_LIMIT_BYTES,
} from '@/services/publicContactInquiryRules';

const CONTACT_LIMIT = 3;
const CONTACT_WINDOW_MS = 60 * 60 * 1000;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function createReference(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `MTC-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  if (!isTrustedPortalMutation(request, resolvePublicPortalOrigin())) {
    return errorResponse(
      'FORBIDDEN_ORIGIN',
      'This request must originate from the Mandyal Travels portal.',
      403,
    );
  }

  const body = await readJsonObject(request, PUBLIC_CONTACT_BODY_LIMIT_BYTES);
  if (!body) return errorResponse('INVALID_REQUEST', 'Enter valid contact details.', 400);

  const normalized = normalizePublicContactInquiry(body);
  if (!normalized.ok) return errorResponse('INVALID_REQUEST', normalized.error, 400);

  const rateLimit = await consumeRateLimit({
    action: 'PUBLIC_CONTACT_CREATE',
    identifier: getRequestRateLimitIdentifier(request, normalized.data.email),
    limit: CONTACT_LIMIT,
    windowMs: CONTACT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many messages were sent. Please wait before trying again.',
        },
      },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  }

  try {
    const inquiry = await prisma.contactInquiry.create({
      data: { ...normalized.data, reference: createReference() },
      select: { reference: true },
    });
    return NextResponse.json({ data: inquiry }, { status: 201 });
  } catch (error) {
    console.error('Public contact inquiry creation failed.', error);
    return errorResponse(
      'CONTACT_INQUIRY_CREATE_FAILED',
      'Your message could not be recorded. Please call or email us.',
      500,
    );
  }
}
