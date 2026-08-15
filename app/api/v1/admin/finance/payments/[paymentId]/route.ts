import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  createLedgerData,
  isReconciliationState,
  normalizeFinanceNote,
  normalizeMoney,
} from '@/services/adminFinanceService';

type RouteContext = { params: Promise<{ paymentId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return NextResponse.json(
      { error: 'Platform administrator access is required.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request, 4096);
  const status = body?.status;
  const providerAmount = normalizeMoney(body?.providerAmount);
  const providerCurrency = normalizeFinanceNote(body?.providerCurrency, 3).toUpperCase();
  const note = normalizeFinanceNote(body?.note);
  if (!isReconciliationState(status) || !providerAmount || providerCurrency.length !== 3) {
    return NextResponse.json(
      { error: 'Provide a valid reconciliation status, provider amount, and currency.' },
      { status: 400 },
    );
  }

  const { paymentId } = await context.params;
  try {
    const payment = await prisma.$transaction(async (transaction) => {
      const current = await transaction.paymentTransaction.findUnique({ where: { id: paymentId } });
      if (!current) return null;
      const updated = await transaction.paymentTransaction.update({
        data: {
          providerAmount,
          providerCurrency,
          reconciledAt: new Date(),
          reconciledByUserId: administrator.id,
          reconciliationNote: note,
          reconciliationStatus: status,
        },
        where: { id: current.id },
      });
      if (status === 'MATCHED') {
        const existingEntry = await transaction.financialLedgerEntry.findFirst({
          where: { entryType: 'PAYMENT_CAPTURE', paymentId: current.id },
        });
        if (!existingEntry) {
          await transaction.financialLedgerEntry.create({
            data: createLedgerData({
              amount: current.amount,
              createdByUserId: administrator.id,
              currency: current.currency,
              description: `Reconciled payment ${current.providerRef}`,
              entryType: 'PAYMENT_CAPTURE',
              paymentId: current.id,
              reference: current.providerRef,
            }),
          });
        }
      }
      return updated;
    });
    if (!payment) return NextResponse.json({ error: 'Payment was not found.' }, { status: 404 });
    return NextResponse.json({ data: { id: payment.id, status: payment.reconciliationStatus } });
  } catch (error) {
    console.error('Payment reconciliation failed.', error);
    return NextResponse.json({ error: 'The payment could not be reconciled.' }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return NextResponse.json(
      { error: 'Platform administrator access is required.' },
      { status: 403 },
    );
  }
  const body = await readJsonObject(request, 4096);
  const amount = normalizeMoney(body?.amount);
  const reason = normalizeFinanceNote(body?.reason);
  if (!amount || reason.length < 5) {
    return NextResponse.json(
      { error: 'Provide a valid refund amount and reason.' },
      { status: 400 },
    );
  }
  const { paymentId } = await context.params;
  try {
    const refund = await prisma.$transaction(async (transaction) => {
      const payment = await transaction.paymentTransaction.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status !== 'captured' || amount > payment.amount) return null;
      const pendingTotal = await transaction.refundRequest.aggregate({
        _sum: { amount: true },
        where: { paymentId, status: { in: ['PENDING', 'APPROVED'] } },
      });
      if ((pendingTotal._sum.amount ?? 0) + amount > payment.amount) return null;
      return transaction.refundRequest.create({
        data: {
          amount,
          bookingId: payment.bookingId,
          currency: payment.currency,
          paymentId,
          reason,
          requestedByUserId: administrator.id,
        },
      });
    });
    if (!refund) {
      return NextResponse.json(
        { error: 'The refund exceeds the captured or remaining refundable amount.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ data: { id: refund.id, status: refund.status } }, { status: 201 });
  } catch (error) {
    console.error('Refund request creation failed.', error);
    return NextResponse.json(
      { error: 'The refund request could not be created.' },
      { status: 500 },
    );
  }
}
