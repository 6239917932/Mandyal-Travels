import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

type TravelRequestRouteContext = { params: Promise<{ requestId: string }> };

export async function PATCH(request: Request, { params }: TravelRequestRouteContext) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: 'The review details are invalid.' }, { status: 400 });
  }

  const status = typeof body.status === 'string' ? body.status.trim().toUpperCase() : '';
  const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote.trim() : '';
  if (status !== 'APPROVED' && status !== 'REJECTED') {
    return NextResponse.json({ error: 'Select approve or reject.' }, { status: 400 });
  }
  if (reviewNote.length > 500) {
    return NextResponse.json(
      { error: 'The review note must be 500 characters or less.' },
      { status: 400 },
    );
  }

  const { requestId } = await params;

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const reviewed = await transaction.businessTravelRequest.updateMany({
        data: {
          reviewNote: reviewNote || null,
          reviewedAt: new Date(),
          reviewedByUserId: access.user.id,
          status,
        },
        where: {
          id: requestId,
          organizationId: access.membership.organizationId,
          status: 'PENDING',
        },
      });
      if (reviewed.count === 1) {
        await transaction.businessAuditLog.create({
          data: createBusinessAuditData({
            action: BUSINESS_AUDIT_ACTIONS.REQUEST_REVIEWED,
            actorUserId: access.user.id,
            entityId: requestId,
            entityType: 'TRAVEL_REQUEST',
            metadata: { reviewNote: reviewNote || null, status },
            organizationId: access.membership.organizationId,
            summary: `Company travel request ${status.toLowerCase()}.`,
          }),
        });
      }
      return reviewed;
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'This pending request was not found or has already been reviewed.' },
        { status: 409 },
      );
    }

    return NextResponse.json({ data: { id: requestId, status } });
  } catch (error) {
    console.error('Business travel request review failed.', error);
    return NextResponse.json(
      { error: 'The company travel request could not be reviewed.' },
      { status: 500 },
    );
  }
}
