import { NextResponse } from 'next/server';

import { normalizeEmail, EMAIL_PATTERN } from '@/lib/auth/validation';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';
import {
  createBusinessInvitationToken,
  getBusinessInvitationExpiry,
} from '@/services/businessInvitationService';

export async function POST(request: Request) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Enter a valid invitation request.' }, { status: 400 });
  }
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid traveller email address.' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    include: { organizationMemberships: { select: { organizationId: true } } },
    where: { email },
  });
  if (existingUser?.organizationMemberships.length) {
    const belongsHere = existingUser.organizationMemberships.some(
      (membership) => membership.organizationId === access.membership.organizationId,
    );
    return NextResponse.json(
      {
        error: belongsHere
          ? 'This traveller already belongs to your organization.'
          : 'This traveller already belongs to another organization.',
      },
      { status: 409 },
    );
  }

  const existingInvitation = await prisma.organizationInvitation.findFirst({
    where: {
      email,
      organizationId: access.membership.organizationId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInvitation) {
    return NextResponse.json(
      {
        error:
          'A current invitation already exists for this email. Revoke it before creating another.',
      },
      { status: 409 },
    );
  }

  const { token, tokenHash } = createBusinessInvitationToken();
  const expiresAt = getBusinessInvitationExpiry();
  const invitation = await prisma.$transaction(async (transaction) => {
    const createdInvitation = await transaction.organizationInvitation.create({
      data: {
        email,
        expiresAt,
        invitedByUserId: access.user.id,
        organizationId: access.membership.organizationId,
        role: 'TRAVELLER',
        tokenHash,
      },
    });

    await transaction.businessAuditLog.create({
      data: createBusinessAuditData({
        action: BUSINESS_AUDIT_ACTIONS.INVITATION_CREATED,
        actorUserId: access.user.id,
        entityId: createdInvitation.id,
        entityType: 'INVITATION',
        metadata: { email, expiresAt: expiresAt.toISOString(), role: 'TRAVELLER' },
        organizationId: access.membership.organizationId,
        summary: `Traveller invitation created for ${email}.`,
      }),
    });

    return createdInvitation;
  });

  return NextResponse.json(
    {
      data: {
        acceptPath: `/business/invitations/${token}`,
        email: invitation.email,
        expiresAt: invitation.expiresAt.toISOString(),
        id: invitation.id,
      },
    },
    { status: 201 },
  );
}
