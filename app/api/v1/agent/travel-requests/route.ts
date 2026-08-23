import { NextResponse } from 'next/server';

import { getAgencyAdminAccess } from '@/lib/agentAuth';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import {
  AGENCY_REQUEST_IDEMPOTENCY_KEY_PATTERN,
  matchesAgencyTravelRequest,
  parseAgencyTravelRequestInput,
} from '@/services/agencyTravelRequestService';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';
import { evaluateBusinessTravelRequest } from '@/services/businessTravelRequestService';

export async function POST(request: Request) {
  const access = await getAgencyAdminAccess();
  if (!access) {
    return NextResponse.json(
      { error: 'Travel agency administrator access required.' },
      { status: 403 },
    );
  }

  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
  if (!AGENCY_REQUEST_IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return NextResponse.json({ error: 'A valid request identifier is required.' }, { status: 400 });
  }
  const body = await readJsonObject(request);
  if (!body)
    return NextResponse.json({ error: 'The request details are invalid.' }, { status: 400 });
  const parsed = parseAgencyTravelRequestInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const input = parsed.value;
  const customer = await prisma.agencyCustomer.findFirst({
    select: { displayName: true, id: true },
    where: {
      id: input.agencyCustomerId,
      organizationId: access.organization.id,
      status: 'ACTIVE',
    },
  });
  if (!customer)
    return NextResponse.json({ error: 'Select an active agency customer.' }, { status: 404 });

  try {
    const existing = await prisma.businessTravelRequest.findUnique({
      include: { agencyCustomerLink: true },
      where: { idempotencyKey },
    });
    if (existing) {
      if (
        !matchesAgencyTravelRequest(
          {
            agencyCustomerId: existing.agencyCustomerLink?.agencyCustomerId ?? null,
            endDate: existing.endDate,
            estimatedAmount: existing.estimatedAmount,
            organizationId: existing.organizationId,
            productType: existing.productType,
            requesterId: existing.requesterId,
            startDate: existing.startDate,
            title: existing.title,
          },
          input,
          { organizationId: access.organization.id, requesterId: access.user.id },
        )
      ) {
        return NextResponse.json(
          { error: 'This request identifier has already been used.' },
          { status: 409 },
        );
      }
      return NextResponse.json({
        data: { customerName: customer.displayName, request: existing },
      });
    }

    const travelRequest = await prisma.$transaction(async (transaction) => {
      const policy = await transaction.organization.findUnique({
        select: {
          approvalRequired: true,
          defaultCabinClass: true,
          id: true,
          maximumTripAmount: true,
          policyVersions: {
            orderBy: { version: 'desc' },
            select: { id: true, version: true },
            take: 1,
          },
        },
        where: { id: access.organization.id },
      });
      if (!policy) throw new Error('ORGANIZATION_NOT_FOUND');
      const policyVersion = policy.policyVersions[0];
      const decision = evaluateBusinessTravelRequest(policy, input.estimatedAmount);
      const created = await transaction.businessTravelRequest.create({
        data: {
          agencyCustomerLink: { create: { agencyCustomerId: customer.id } },
          currency: 'INR',
          endDate: input.endDate,
          estimatedAmount: input.estimatedAmount,
          idempotencyKey,
          organizationId: policy.id,
          policyReason: decision.policyReason,
          policySnapshotJson: JSON.stringify({
            approvalRequired: policy.approvalRequired,
            defaultCabinClass: policy.defaultCabinClass,
            maximumTripAmount: policy.maximumTripAmount,
            version: policyVersion?.version ?? null,
          }),
          policyVersionId: policyVersion?.id,
          productType: input.productType,
          requesterId: access.user.id,
          startDate: input.startDate,
          status: decision.status,
          title: input.title,
        },
        include: { agencyCustomerLink: true },
      });
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: BUSINESS_AUDIT_ACTIONS.REQUEST_CREATED,
          actorUserId: access.user.id,
          entityId: created.id,
          entityType: 'TRAVEL_REQUEST',
          metadata: {
            agencyCustomerId: customer.id,
            estimatedAmount: input.estimatedAmount,
            productType: input.productType,
            status: created.status,
          },
          organizationId: policy.id,
          summary: `${input.productType.toLowerCase()} request created for an agency customer.`,
        }),
      });
      return created;
    });
    return NextResponse.json(
      { data: { customerName: customer.displayName, request: travelRequest } },
      { status: 201 },
    );
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) {
      const existing = await prisma.businessTravelRequest.findUnique({
        include: { agencyCustomerLink: true },
        where: { idempotencyKey },
      });
      if (
        existing &&
        matchesAgencyTravelRequest(
          {
            agencyCustomerId: existing.agencyCustomerLink?.agencyCustomerId ?? null,
            endDate: existing.endDate,
            estimatedAmount: existing.estimatedAmount,
            organizationId: existing.organizationId,
            productType: existing.productType,
            requesterId: existing.requesterId,
            startDate: existing.startDate,
            title: existing.title,
          },
          input,
          { organizationId: access.organization.id, requesterId: access.user.id },
        )
      ) {
        return NextResponse.json({
          data: { customerName: customer.displayName, request: existing },
        });
      }
      return NextResponse.json(
        { error: 'This request identifier has already been used.' },
        { status: 409 },
      );
    }
    console.error('Agency travel request creation failed.', error);
    return NextResponse.json(
      { error: 'The customer travel request could not be created.' },
      { status: 500 },
    );
  }
}
