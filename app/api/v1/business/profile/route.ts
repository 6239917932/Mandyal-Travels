import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { isValidEmail, normalizeEmail } from '@/lib/auth/validation';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,24}$/;
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

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
  const legalName = typeof body.legalName === 'string' ? body.legalName.trim() : '';
  const billingAddress = typeof body.billingAddress === 'string' ? body.billingAddress.trim() : '';
  const contactEmail = normalizeEmail(
    typeof body.contactEmail === 'string' ? body.contactEmail : '',
  );
  const contactPhone = typeof body.contactPhone === 'string' ? body.contactPhone.trim() : '';
  const taxRegistrationId =
    typeof body.taxRegistrationId === 'string' ? body.taxRegistrationId.trim().toUpperCase() : '';

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json(
      { error: 'Enter an organization name between 2 and 120 characters.' },
      { status: 400 },
    );
  }
  if (!isValidEmail(contactEmail)) {
    return NextResponse.json({ error: 'Enter a valid contact email.' }, { status: 400 });
  }
  if (legalName.length < 2 || legalName.length > 160) {
    return NextResponse.json(
      { error: 'Enter a legal or registered name between 2 and 160 characters.' },
      { status: 400 },
    );
  }
  if (billingAddress.length < 10 || billingAddress.length > 500) {
    return NextResponse.json(
      { error: 'Enter a billing address between 10 and 500 characters.' },
      { status: 400 },
    );
  }
  if (contactPhone && !PHONE_PATTERN.test(contactPhone)) {
    return NextResponse.json(
      { error: 'Enter a valid contact phone number or leave it blank.' },
      { status: 400 },
    );
  }
  if (taxRegistrationId && !GSTIN_PATTERN.test(taxRegistrationId)) {
    return NextResponse.json(
      { error: 'Enter a valid 15-character GST registration number or leave it blank.' },
      { status: 400 },
    );
  }

  try {
    const organization = await prisma.$transaction(async (transaction) => {
      const current = await transaction.organization.findUnique({
        select: {
          billingAddress: true,
          contactEmail: true,
          contactPhone: true,
          legalName: true,
          name: true,
          taxRegistrationId: true,
        },
        where: { id: access.membership.organizationId },
      });
      if (!current) throw new Error('ORGANIZATION_NOT_FOUND');

      const nextProfile = {
        billingAddress,
        contactEmail,
        contactPhone: contactPhone || null,
        legalName,
        name,
        taxRegistrationId: taxRegistrationId || null,
      };
      const changed =
        current.name !== nextProfile.name ||
        current.legalName !== nextProfile.legalName ||
        current.billingAddress !== nextProfile.billingAddress ||
        current.contactEmail !== nextProfile.contactEmail ||
        current.contactPhone !== nextProfile.contactPhone ||
        current.taxRegistrationId !== nextProfile.taxRegistrationId;
      if (!changed) return current;

      const updated = await transaction.organization.update({
        data: nextProfile,
        select: {
          billingAddress: true,
          contactEmail: true,
          contactPhone: true,
          legalName: true,
          name: true,
          taxRegistrationId: true,
        },
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
          summary: 'Organization contact and billing profile updated.',
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
