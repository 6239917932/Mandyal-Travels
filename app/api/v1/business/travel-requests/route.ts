import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getOrganizationMembershipForCurrentUser } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import {
  BUSINESS_TRAVEL_PRODUCTS,
  evaluateBusinessTravelRequest,
} from '@/services/businessTravelRequestService';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readText(value: unknown, maximumLength: number) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text.length <= maximumLength ? text : '';
}

function isValidIsoDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  const access = await getOrganizationMembershipForCurrentUser();
  if (!access) {
    return NextResponse.json(
      { error: 'An active organization membership is required.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: 'The request details are invalid.' }, { status: 400 });
  }

  const productType = readText(body.productType, 20).toUpperCase();
  const title = readText(body.title, 160);
  const startDate = readText(body.startDate, 10);
  const endDate = body.endDate == null ? null : readText(body.endDate, 10);
  const estimatedAmount = body.estimatedAmount;

  if (!BUSINESS_TRAVEL_PRODUCTS.has(productType)) {
    return NextResponse.json({ error: 'Select a valid travel product.' }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json(
      { error: 'Enter a short trip purpose or destination.' },
      { status: 400 },
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  if (!isValidIsoDate(startDate) || startDate < today) {
    return NextResponse.json({ error: 'Enter a valid future travel date.' }, { status: 400 });
  }
  if (endDate !== null && (!isValidIsoDate(endDate) || endDate < startDate)) {
    return NextResponse.json(
      { error: 'The end date must be on or after the start date.' },
      { status: 400 },
    );
  }
  if (
    typeof estimatedAmount !== 'number' ||
    !Number.isInteger(estimatedAmount) ||
    estimatedAmount < 1 ||
    estimatedAmount > 10_000_000
  ) {
    return NextResponse.json(
      { error: 'Estimated amount must be between INR 1 and INR 1,00,00,000.' },
      { status: 400 },
    );
  }

  try {
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
        where: { id: access.membership.organization.id },
      });
      if (!policy) throw new Error('ORGANIZATION_NOT_FOUND');
      const policyVersion = policy.policyVersions[0];
      const decision = evaluateBusinessTravelRequest(policy, estimatedAmount);
      const createdRequest = await transaction.businessTravelRequest.create({
        data: {
          currency: 'INR',
          endDate,
          estimatedAmount,
          organizationId: policy.id,
          policyReason: decision.policyReason,
          policySnapshotJson: JSON.stringify({
            approvalRequired: policy.approvalRequired,
            defaultCabinClass: policy.defaultCabinClass,
            maximumTripAmount: policy.maximumTripAmount,
            version: policyVersion?.version ?? null,
          }),
          policyVersionId: policyVersion?.id,
          productType,
          requesterId: access.user.id,
          startDate,
          status: decision.status,
          title,
        },
        select: { id: true, policyReason: true, status: true },
      });
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: BUSINESS_AUDIT_ACTIONS.REQUEST_CREATED,
          actorUserId: access.user.id,
          entityId: createdRequest.id,
          entityType: 'TRAVEL_REQUEST',
          metadata: {
            estimatedAmount,
            policyVersion: policyVersion?.version ?? null,
            productType,
            status: createdRequest.status,
          },
          organizationId: policy.id,
          summary: `${productType.toLowerCase()} travel request created.`,
        }),
      });
      return createdRequest;
    });

    return NextResponse.json({ data: travelRequest }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'ORGANIZATION_NOT_FOUND') {
      return NextResponse.json({ error: 'The organization was not found.' }, { status: 404 });
    }
    console.error('Business travel request creation failed.', error);
    return NextResponse.json(
      { error: 'The company travel request could not be created.' },
      { status: 500 },
    );
  }
}