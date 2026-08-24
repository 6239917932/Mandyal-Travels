import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { getCurrentUser } from '@/lib/auth/session';
import {
  createCustomerSupportCase,
  CustomerSupportRequestError,
} from '@/services/customerSupportCenterService';
import {
  CUSTOMER_SUPPORT_BODY_LIMIT_BYTES,
  isDirectSameOriginSupportMutation,
  normalizeCustomerBookingReference,
  readCustomerServicingIntent,
  readCustomerSupportCategory,
} from '@/services/customerServicingIntentRules';

const SUPPORT_CASE_LIMIT = 5;
const SUPPORT_CASE_WINDOW_MS = 60 * 60 * 1000;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  if (!isDirectSameOriginSupportMutation(request)) {
    return errorResponse(
      'FORBIDDEN_ORIGIN',
      'This request must originate from the Mandyal Travels portal.',
      403,
    );
  }

  const user = await getCurrentUser();
  if (!user) return errorResponse('AUTH_REQUIRED', 'Sign in to create a support case.', 401);

  const body = await readJsonObject(request, CUSTOMER_SUPPORT_BODY_LIMIT_BYTES);
  if (!body) return errorResponse('INVALID_REQUEST', 'Enter valid support case details.', 400);

  const category = readCustomerSupportCategory(body.category);
  const intent = readCustomerServicingIntent(body.intent);
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const bookingReference = normalizeCustomerBookingReference(body.bookingReference);

  if (!category) return errorResponse('INVALID_CATEGORY', 'Choose a valid support category.', 400);
  if (!intent) return errorResponse('INVALID_INTENT', 'Choose a valid support request type.', 400);
  if (subject.length < 5 || subject.length > 120) {
    return errorResponse('INVALID_SUBJECT', 'Enter a subject between 5 and 120 characters.', 400);
  }
  if (message.length < 10 || message.length > 2000) {
    return errorResponse('INVALID_MESSAGE', 'Enter details between 10 and 2,000 characters.', 400);
  }
  if (bookingReference === null) {
    return errorResponse(
      'INVALID_BOOKING_REFERENCE',
      'Enter a valid booking reference or leave it blank.',
      400,
    );
  }

  const rateLimit = await consumeRateLimit({
    action: 'CUSTOMER_SUPPORT_CREATE',
    identifier: getRequestRateLimitIdentifier(request, user.id),
    limit: SUPPORT_CASE_LIMIT,
    windowMs: SUPPORT_CASE_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many support requests. Please wait before creating another case.',
        },
      },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  }

  try {
    const supportCase = await createCustomerSupportCase({
      bookingReference,
      category,
      email: user.email,
      intent,
      message,
      subject,
      userId: user.id,
    });
    return NextResponse.json({ data: supportCase }, { status: 201 });
  } catch (error) {
    if (error instanceof CustomerSupportRequestError) {
      return errorResponse(error.code, error.message, 400);
    }
    console.error('Customer support case creation failed.', error);
    return errorResponse(
      'SUPPORT_CASE_CREATE_FAILED',
      'The support case could not be created.',
      500,
    );
  }
}
