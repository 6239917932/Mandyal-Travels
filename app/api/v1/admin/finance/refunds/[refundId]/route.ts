import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { createRefundPostings } from '@/lib/payments/accounting';
import {
  createLedgerData,
  isRefundDecision,
  normalizeFinanceNote,
} from '@/services/adminFinanceService';
import { dispatchProviderRefund } from '@/services/paymentGatewayService';

type RouteContext = { params: Promise<{ refundId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return NextResponse.json(
      { error: 'Platform administrator access is required.' },
      { status: 403 },
    );
  }
  const body = await readJsonObject(request, 4096);
  const decision = body?.decision;
  const note = normalizeFinanceNote(body?.note);
  if (!isRefundDecision(decision) || (decision === 'REJECT' && note.length < 5)) {
    return NextResponse.json(
      { error: 'Provide a valid refund decision and review note.' },
      { status: 400 },
    );
  }
  const { refundId } = await context.params;
  try {
    if (decision === 'REJECT') {
      const rejected = await prisma.refundRequest.updateMany({
        data: {
          reviewNote: note,
          reviewedAt: new Date(),
          reviewedByUserId: administrator.id,
          status: 'REJECTED',
        },
        where: { id: refundId, status: 'PENDING' },
      });
      if (rejected.count !== 1) {
        return NextResponse.json(
          { error: 'Only pending refunds can be reviewed.' },
          { status: 409 },
        );
      }
      return NextResponse.json({ data: { id: refundId, status: 'REJECTED' } });
    }

    const claimed = await prisma.$transaction(async (transaction) => {
      const result = await transaction.refundRequest.updateMany({
        data: { status: 'PROCESSING' },
        where: { id: refundId, status: { in: ['PENDING', 'PROVIDER_FAILED'] } },
      });
      if (result.count !== 1) return null;
      return transaction.refundRequest.findUnique({
        include: { payment: { select: { providerRef: true } } },
        where: { id: refundId },
      });
    });
    if (!claimed) {
      return NextResponse.json(
        { error: 'Only pending or failed refunds can be approved.' },
        { status: 409 },
      );
    }

    let providerRefundRef: string;
    try {
      const providerResult = await dispatchProviderRefund({
        amount: claimed.amount,
        currency: claimed.currency,
        idempotencyKey: `refund-${claimed.id}`,
        providerPaymentRef: claimed.payment.providerRef,
        reason: claimed.reason,
      });
      providerRefundRef = providerResult.providerRefundRef;
    } catch (error) {
      await prisma.refundRequest.updateMany({
        data: { status: 'PROVIDER_FAILED' },
        where: { id: claimed.id, status: 'PROCESSING' },
      });
      console.error('Provider refund dispatch failed.', error);
      return NextResponse.json(
        { error: 'The provider did not complete the refund. It remains available for retry.' },
        { status: 503 },
      );
    }

    const refund = await prisma.$transaction(async (transaction) => {
      const completed = await transaction.refundRequest.updateMany({
        data: {
          providerRefundRef,
          reviewNote: note,
          reviewedAt: new Date(),
          reviewedByUserId: administrator.id,
          status: 'APPROVED',
        },
        where: { id: claimed.id, status: 'PROCESSING' },
      });
      if (completed.count !== 1) return null;
      const existingJournal = await transaction.financialJournal.findUnique({
        where: { reference: `REFUND-${claimed.id}` },
      });
      if (!existingJournal) {
        const postings = createRefundPostings(claimed.amount);
        await transaction.financialJournal.create({
          data: {
            createdByUserId: administrator.id,
            currency: claimed.currency,
            description: `Completed provider refund for ${claimed.reason}`,
            postings: { create: postings },
            reference: `REFUND-${claimed.id}`,
            refundId: claimed.id,
            sourceId: claimed.id,
            sourceType: 'REFUND_APPROVED',
            totalCredit: claimed.amount,
            totalDebit: claimed.amount,
          },
        });
        await transaction.financialLedgerEntry.create({
          data: createLedgerData({
            amount: -claimed.amount,
            createdByUserId: administrator.id,
            currency: claimed.currency,
            description: `Completed provider refund for ${claimed.reason}`,
            entryType: 'REFUND_APPROVED',
            reference: claimed.id,
            refundId: claimed.id,
          }),
        });
      }
      return transaction.refundRequest.findUnique({ where: { id: claimed.id } });
    });
    if (!refund) {
      return NextResponse.json(
        { error: 'The refund state changed while it was processed.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ data: { id: refund.id, status: refund.status } });
  } catch (error) {
    console.error('Refund review failed.', error);
    return NextResponse.json({ error: 'The refund could not be reviewed.' }, { status: 500 });
  }
}
