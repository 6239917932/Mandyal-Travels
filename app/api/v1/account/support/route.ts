import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getCurrentUser } from '@/lib/auth/session';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { prisma } from '@/lib/prisma';

const SUPPORT_CATEGORIES = new Set(['ACCOUNT', 'BOOKING', 'PAYMENT', 'TECHNICAL', 'OTHER']);
const BOOKING_REFERENCE_PATTERN = /^[A-Z0-9-]{4,40}$/i;
const SUPPORT_CASE_LIMIT = 5;
const SUPPORT_CASE_WINDOW_MS = 60 * 60 * 1000;

function createCaseNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `MTCC-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to create a support case.' }, { status: 401 });
  }

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: 'Enter valid support case details.' }, { status: 400 });
  }

  const category = typeof body.category === 'string' ? body.category.trim().toUpperCase() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const bookingReference =
    typeof body.bookingReference === 'string' ? body.bookingReference.trim().toUpperCase() : '';

  if (!SUPPORT_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Choose a valid support category.' }, { status: 400 });
  }
  if (subject.length < 5 || subject.length > 120) {
    return NextResponse.json(
      { error: 'Enter a subject between 5 and 120 characters.' },
      { status: 400 },
    );
  }
  if (message.length < 10 || message.length > 2000) {
    return NextResponse.json(
      { error: 'Enter details between 10 and 2,000 characters.' },
      { status: 400 },
    );
  }
  if (bookingReference && !BOOKING_REFERENCE_PATTERN.test(bookingReference)) {
    return NextResponse.json(
      { error: 'Enter a valid booking reference or leave it blank.' },
      { status: 400 },
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
      { error: 'Too many support requests. Please wait before creating another case.' },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  }

  try {
    const [customerTrip, hotelBooking] = bookingReference
      ? await Promise.all([
          prisma.customerTrip.findFirst({
            select: { id: true },
            where: {
              confirmationCode: bookingReference,
              OR: [{ userId: user.id }, { email: user.email }],
            },
          }),
          prisma.booking.findFirst({
            select: { id: true },
            where: { confirmationCode: bookingReference, guest: { is: { email: user.email } } },
          }),
        ])
      : [null, null];

    if (bookingReference && !customerTrip && !hotelBooking) {
      return NextResponse.json(
        { error: 'That booking reference is not connected to this account.' },
        { status: 400 },
      );
    }

    const supportCase = await prisma.$transaction(async (transaction) => {
      const created = await transaction.customerSupportCase.create({
        data: {
          bookingReference: bookingReference || null,
          caseNumber: createCaseNumber(),
          category,
          customerTripId: customerTrip?.id,
          hotelBookingId: hotelBooking?.id,
          message,
          status: 'OPEN',
          subject,
          userId: user.id,
        },
        select: { caseNumber: true, createdAt: true, id: true, status: true },
      });
      await transaction.customerSupportCaseEvent.create({
        data: {
          action: 'CREATED',
          actorUserId: user.id,
          caseId: created.id,
          summary: `Customer support case ${created.caseNumber} created.`,
        },
      });
      return created;
    });

    return NextResponse.json({ data: supportCase }, { status: 201 });
  } catch (error) {
    console.error('Customer support case creation failed.', error);
    return NextResponse.json({ error: 'The support case could not be created.' }, { status: 500 });
  }
}
