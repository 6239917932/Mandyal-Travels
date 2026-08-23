import { NextResponse } from 'next/server';

import { getAgencyAdminAccess } from '@/lib/agentAuth';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { parseAgencyCustomerInput } from '@/services/agencyCustomerService';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/v1/agent/customers/[customerId]'>,
) {
  const access = await getAgencyAdminAccess();
  if (!access) {
    return NextResponse.json(
      { error: 'Travel agency administrator access required.' },
      { status: 403 },
    );
  }

  const { customerId } = await context.params;
  const existing = await prisma.agencyCustomer.findFirst({
    where: { id: customerId, organizationId: access.organization.id },
  });
  if (!existing) return NextResponse.json({ error: 'Agency customer not found.' }, { status: 404 });

  const body = await readJsonObject(request);
  if (!body)
    return NextResponse.json({ error: 'The customer details are invalid.' }, { status: 400 });
  const parsed = parseAgencyCustomerInput(
    body,
    existing.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  );
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const customer = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.agencyCustomer.update({
        data: parsed.value,
        where: { id: existing.id },
      });
      const statusChanged = existing.status !== updated.status;
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: statusChanged
            ? BUSINESS_AUDIT_ACTIONS.AGENCY_CUSTOMER_STATUS_UPDATED
            : BUSINESS_AUDIT_ACTIONS.AGENCY_CUSTOMER_UPDATED,
          actorUserId: access.user.id,
          entityId: updated.id,
          entityType: 'AGENCY_CUSTOMER',
          metadata: { status: updated.status },
          organizationId: access.organization.id,
          summary: statusChanged
            ? `Agency customer status changed to ${updated.status.toLowerCase()}.`
            : 'Agency customer profile updated.',
        }),
      });
      return updated;
    });
    return NextResponse.json({ data: { customer } });
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) {
      return NextResponse.json(
        { error: 'A customer with this email already exists in the agency workspace.' },
        { status: 409 },
      );
    }
    console.error('Agency customer update failed.', error);
    return NextResponse.json(
      { error: 'The customer profile could not be updated.' },
      { status: 500 },
    );
  }
}
