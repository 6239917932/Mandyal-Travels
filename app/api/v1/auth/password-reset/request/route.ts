import { after } from 'next/server';

import { isTrustedPortalMutation } from '@/lib/api/portalOrigin';
import { readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { isValidEmail, normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import { sendPasswordResetEmail } from '@/services/passwordResetService';

const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const GENERIC_MESSAGE =
  'If an account uses that email address, a password reset link will be sent shortly.';

export async function POST(request: Request): Promise<Response> {
  if (!isTrustedPortalMutation(request, resolvePublicPortalOrigin())) {
    return Response.json(
      { error: 'This request must originate from the Mandyal Travels portal.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request);
  const email = normalizeEmail(typeof body?.email === 'string' ? body.email : '');
  const rateLimit = await consumeRateLimit({
    action: 'PASSWORD_RESET_REQUEST',
    identifier: getRequestRateLimitIdentifier(request, email || 'invalid'),
    limit: REQUEST_LIMIT,
    windowMs: REQUEST_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Too many password reset requests. Please wait before trying again.' },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  }

  if (isValidEmail(email)) {
    const user = await prisma.user.findUnique({
      select: { email: true, firstName: true, id: true },
      where: { email },
    });
    if (user) after(() => sendPasswordResetEmail(user));
  }

  return Response.json({ data: { message: GENERIC_MESSAGE } }, { status: 202 });
}
