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
    const refund = await prisma.$transaction(async (transaction) => {
      const current = await transaction.refundRequest.findUnique({ where: { id: refundId } });
      if (!current || current.status !== 'PENDING') return null;
      const status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const updated = await transaction.refundRequest.update({
        data: {
          reviewNote: note,
          reviewedAt: new Date(),
          reviewedByUserId: administrator.id,
          status,
        },
        where: { id: current.id },
      });
      if (status === 'APPROVED') {
        const postings = createRefundPostings(current.amount);
        await transaction.financialJournal.create({
          data: {
            createdByUserId: administrator.id,
            currency: current.currency,
            description: `Approved refund for ${current.reason}`,
            postings: { create: postings },
            reference: `REFUND-${current.id}`,
            refundId: current.id,
            sourceId: current.id,
            sourceType: 'REFUND_APPROVED',
            totalCredit: current.amount,
            totalDebit: current.amount,
          },
        });
        await transaction.financialLedgerEntry.create({
          data: createLedgerData({
            amount: -current.amount,
            createdByUserId: administrator.id,
            currency: current.currency,
            description: `Approved refund for ${current.reason}`,
            entryType: 'REFUND_APPROVED',
            reference: current.id,
            refundId: current.id,
          }),
        });
      }
      return updated;
    });
    if (!refund) {
      return NextResponse.json({ error: 'Only pending refunds can be reviewed.' }, { status: 409 });
    }
    return NextResponse.json({ data: { id: refund.id, status: refund.status } });
  } catch (error) {
    console.error('Refund review failed.', error);
    return NextResponse.json({ error: 'The refund could not be reviewed.' }, { status: 500 });
  }
}
