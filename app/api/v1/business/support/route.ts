import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

const SUPPORT_CATEGORIES = new Set(['ACCOUNT', 'BILLING', 'BOOKING', 'OTHER', 'TECHNICAL']);
const BOOKING_REFERENCE_PATTERN = /^[A-Z0-9-]{4,40}$/i;

function createCaseNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `MTCS-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
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

  try {
    const supportCase = await prisma.$transaction(async (transaction) => {
      const created = await transaction.businessSupportCase.create({
        data: {
          bookingReference: bookingReference || null,
          caseNumber: createCaseNumber(),
          category,
          createdByUserId: access.user.id,
          message,
          organizationId: access.membership.organizationId,
          status: 'OPEN',
          subject,
        },
        select: { caseNumber: true, createdAt: true, id: true, status: true },
      });

      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: BUSINESS_AUDIT_ACTIONS.SUPPORT_CASE_CREATED,
          actorUserId: access.user.id,
          entityId: created.id,
          entityType: 'SUPPORT_CASE',
          metadata: { bookingReference: bookingReference || null, caseNumber: created.caseNumber },
          organizationId: access.membership.organizationId,
          summary: `Support case ${created.caseNumber} created.`,
        }),
      });

      return created;
    });

    return NextResponse.json({ data: supportCase }, { status: 201 });
  } catch (error) {
    console.error('Business support case creation failed.', error);
    return NextResponse.json({ error: 'The support case could not be created.' }, { status: 500 });
  }
}
