import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getAgencyAdminAccess } from '@/lib/agentAuth';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { parseAgencyCustomerInput } from '@/services/agencyCustomerService';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

async function agencyAccess() {
  return getAgencyAdminAccess();
}

export async function GET() {
  const access = await agencyAccess();
  if (!access)
    return NextResponse.json(
      { error: 'Travel agency administrator access required.' },
      { status: 403 },
    );
  const customers = await prisma.agencyCustomer.findMany({
    where: { organizationId: access.organization.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ data: { customers } });
}

export async function POST(request: Request) {
  const access = await agencyAccess();
  if (!access)
    return NextResponse.json(
      { error: 'Travel agency administrator access required.' },
      { status: 403 },
    );
  const body = await readJsonObject(request);
  if (!body)
    return NextResponse.json({ error: 'The customer details are invalid.' }, { status: 400 });
  const parsed = parseAgencyCustomerInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const customer = await prisma.$transaction(async (transaction) => {
      const created = await transaction.agencyCustomer.create({
        data: { ...parsed.value, organizationId: access.organization.id },
      });
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: BUSINESS_AUDIT_ACTIONS.AGENCY_CUSTOMER_CREATED,
          actorUserId: access.user.id,
          entityId: created.id,
          entityType: 'AGENCY_CUSTOMER',
          metadata: { status: created.status },
          organizationId: access.organization.id,
          summary: 'Agency customer profile created.',
        }),
      });
      return created;
    });
    return NextResponse.json({ data: { customer } }, { status: 201 });
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) {
      return NextResponse.json(
        { error: 'A customer with this email already exists in the agency workspace.' },
        { status: 409 },
      );
    }
    console.error('Agency customer creation failed.', error);
    return NextResponse.json(
      { error: 'The customer profile could not be created.' },
      { status: 500 },
    );
  }
}
