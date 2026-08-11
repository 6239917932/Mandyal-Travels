import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { EMAIL_PATTERN, normalizeEmail } from '@/lib/auth/validation';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,24}$/;

export async function PATCH(request: Request) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: 'Enter valid organization details.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const contactEmail = normalizeEmail(
    typeof body.contactEmail === 'string' ? body.contactEmail : '',
  );
  const contactPhone = typeof body.contactPhone === 'string' ? body.contactPhone.trim() : '';

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json(
      { error: 'Enter an organization name between 2 and 120 characters.' },
      { status: 400 },
    );
  }
  if (!EMAIL_PATTERN.test(contactEmail)) {
    return NextResponse.json({ error: 'Enter a valid contact email.' }, { status: 400 });
  }
  if (contactPhone && !PHONE_PATTERN.test(contactPhone)) {
    return NextResponse.json(
      { error: 'Enter a valid contact phone number or leave it blank.' },
      { status: 400 },
    );
  }

  try {
    const organization = await prisma.$transaction(async (transaction) => {
      const current = await transaction.organization.findUnique({
        select: { contactEmail: true, contactPhone: true, name: true },
        where: { id: access.membership.organizationId },
      });
      if (!current) throw new Error('ORGANIZATION_NOT_FOUND');

      const nextProfile = { contactEmail, contactPhone: contactPhone || null, name };
      const changed =
        current.name !== nextProfile.name ||
        current.contactEmail !== nextProfile.contactEmail ||
        current.contactPhone !== nextProfile.contactPhone;
      if (!changed) return current;

      const updated = await transaction.organization.update({
        data: nextProfile,
        select: { contactEmail: true, contactPhone: true, name: true },
        where: { id: access.membership.organizationId },
      });
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: BUSINESS_AUDIT_ACTIONS.ORGANIZATION_PROFILE_UPDATED,
          actorUserId: access.user.id,
          entityId: access.membership.organizationId,
          entityType: 'ORGANIZATION',
          metadata: updated,
          organizationId: access.membership.organizationId,
          summary: 'Organization contact profile updated.',
        }),
      });
      return updated;
    });

    return NextResponse.json({ data: organization });
  } catch (error) {
    if (error instanceof Error && error.message === 'ORGANIZATION_NOT_FOUND') {
      return NextResponse.json({ error: 'The organization was not found.' }, { status: 404 });
    }
    console.error('Organization profile update failed.', error);
    return NextResponse.json(
      { error: 'The organization profile could not be saved.' },
      { status: 500 },
    );
  }
}