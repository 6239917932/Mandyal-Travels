import { NextResponse } from 'next/server';

import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { isValidEmail, normalizeEmail } from '@/lib/auth/validation';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import {
  createPartnerInvitationToken,
  getPartnerInvitationExpiry,
  isPartnerAdministrator,
  PARTNER_ACCESS_ACTIONS,
} from '@/services/partnerAccessService';

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Use the Mandyal Travels partner portal.' }, { status: 403 });
  }
  const access = await getPartnerAccess();
  if (!isPartnerAdministrator(access)) {
    return NextResponse.json(
      { error: 'Supplier administrator access is required.' },
      { status: 403 },
    );
  }
  const body = await readJsonObject(request);
  if (!body)
    return NextResponse.json({ error: 'Enter a valid invitation request.' }, { status: 400 });
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  const role = body.role === 'ADMIN' ? 'ADMIN' : body.role === 'OPERATOR' ? 'OPERATOR' : null;
  if (!isValidEmail(email))
    return NextResponse.json(
      { error: 'Enter a valid team member email address.' },
      { status: 400 },
    );
  if (!role)
    return NextResponse.json(
      { error: 'Select administrator or operator access.' },
      { status: 400 },
    );

  try {
    const existingUser = await prisma.user.findUnique({
      include: { supplyPartnerMemberships: { select: { partnerId: true } } },
      where: { email },
    });
    if (existingUser?.supplyPartnerMemberships.length) {
      const belongsHere = existingUser.supplyPartnerMemberships.some(
        (item) => item.partnerId === access.partnerId,
      );
      return NextResponse.json(
        {
          error: belongsHere
            ? 'This account already belongs to your supplier workspace.'
            : 'This account already belongs to another supplier workspace.',
        },
        { status: 409 },
      );
    }
    const currentInvitation = await prisma.partnerMemberInvitation.findFirst({
      where: { email, expiresAt: { gt: new Date() }, status: 'PENDING' },
    });
    if (currentInvitation)
      return NextResponse.json(
        {
          error:
            'A current supplier invitation already exists for this email. Revoke it before creating another.',
        },
        { status: 409 },
      );

    const { token, tokenHash } = createPartnerInvitationToken();
    const expiresAt = getPartnerInvitationExpiry();
    const invitation = await prisma.$transaction(async (transaction) => {
      const created = await transaction.partnerMemberInvitation.create({
        data: {
          email,
          expiresAt,
          invitedByUserId: access.userId,
          partnerId: access.partnerId,
          role,
          tokenHash,
        },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: PARTNER_ACCESS_ACTIONS.INVITATION_CREATED,
          actorUserId: access.userId,
          entityId: created.id,
          entityType: 'MEMBERSHIP_INVITATION',
          metadataJson: JSON.stringify({ email, expiresAt: expiresAt.toISOString(), role }),
          partnerId: access.partnerId,
          summary: `Supplier team invitation created for ${email} with ${role.toLowerCase()} access.`,
        },
      });
      return created;
    });
    return NextResponse.json(
      {
        data: {
          acceptPath: `/partners/invitations/${token}`,
          email: invitation.email,
          expiresAt: invitation.expiresAt.toISOString(),
          id: invitation.id,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Partner member invitation creation failed.', error);
    return NextResponse.json(
      { error: 'The supplier invitation could not be created.' },
      { status: 500 },
    );
  }
}
