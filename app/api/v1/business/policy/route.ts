import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

const CABIN_CLASSES = new Set(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']);

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
    return NextResponse.json({ error: 'Enter a valid travel policy.' }, { status: 400 });
  }
  const approvalRequired = body.approvalRequired;
  const defaultCabinClass = body.defaultCabinClass;
  const maximumTripAmount = body.maximumTripAmount;

  if (typeof approvalRequired !== 'boolean') {
    return NextResponse.json({ error: 'Select a valid approval setting.' }, { status: 400 });
  }
  if (typeof defaultCabinClass !== 'string' || !CABIN_CLASSES.has(defaultCabinClass)) {
    return NextResponse.json({ error: 'Select a valid default cabin.' }, { status: 400 });
  }
  if (
    maximumTripAmount !== null &&
    (typeof maximumTripAmount !== 'number' ||
      !Number.isInteger(maximumTripAmount) ||
      maximumTripAmount < 1000 ||
      maximumTripAmount > 10_000_000)
  ) {
    return NextResponse.json(
      { error: 'Maximum trip amount must be between INR 1,000 and INR 1,00,00,000.' },
      { status: 400 },
    );
  }

  try {
    const policy = await prisma.$transaction(async (transaction) => {
      const currentPolicy = await transaction.organization.findUnique({
        select: { approvalRequired: true, defaultCabinClass: true, maximumTripAmount: true },
        where: { id: access.membership.organizationId },
      });
      if (!currentPolicy) throw new Error('ORGANIZATION_NOT_FOUND');

      const latestVersion = await transaction.organizationPolicyVersion.findFirst({
        orderBy: { version: 'desc' },
        select: { version: true },
        where: { organizationId: access.membership.organizationId },
      });
      const changed =
        currentPolicy.approvalRequired !== approvalRequired ||
        currentPolicy.defaultCabinClass !== defaultCabinClass ||
        currentPolicy.maximumTripAmount !== maximumTripAmount;

      if (!changed) {
        return { ...currentPolicy, version: latestVersion?.version ?? 1 };
      }

      const updatedPolicy = await transaction.organization.update({
        data: { approvalRequired, defaultCabinClass, maximumTripAmount },
        select: { approvalRequired: true, defaultCabinClass: true, maximumTripAmount: true },
        where: { id: access.membership.organizationId },
      });
      const version = (latestVersion?.version ?? 0) + 1;
      await transaction.organizationPolicyVersion.create({
        data: {
          ...updatedPolicy,
          createdByUserId: access.user.id,
          organizationId: access.membership.organizationId,
          version,
        },
      });
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: BUSINESS_AUDIT_ACTIONS.POLICY_UPDATED,
          actorUserId: access.user.id,
          entityId: access.membership.organizationId,
          entityType: 'ORGANIZATION',
          metadata: { ...updatedPolicy, version },
          organizationId: access.membership.organizationId,
          summary: 'Organization travel policy updated.',
        }),
      });
      return { ...updatedPolicy, version };
    });

    return NextResponse.json({ data: policy });
  } catch (error) {
    if (error instanceof Error && error.message === 'ORGANIZATION_NOT_FOUND') {
      return NextResponse.json({ error: 'The organization was not found.' }, { status: 404 });
    }
    console.error('Business travel policy update failed.', error);
    return NextResponse.json(
      { error: 'The travel policy could not be saved. Refresh the generated database client.' },
      { status: 500 },
    );
  }
}