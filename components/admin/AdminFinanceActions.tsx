'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type ActionResponse = { error?: string };

export function AdminPaymentActions({
  amount,
  currency,
  paymentId,
}: {
  amount: number;
  currency: string;
  paymentId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState('');

  async function reconcile(formData: FormData) {
    const action = String(formData.get('status') ?? '');
    setError('');
    setPendingAction(action);
    try {
      const response = await fetch(
        `/api/v1/admin/finance/payments/${encodeURIComponent(paymentId)}`,
        {
          body: JSON.stringify({
            note: formData.get('note'),
            providerAmount: Number(formData.get('providerAmount')),
            providerCurrency: formData.get('providerCurrency'),
            status: action,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      );
      const result = (await readJsonResponse<ActionResponse>(response)) ?? {};
      if (!response.ok) setError(result.error ?? 'Reconciliation failed.');
      else router.refresh();
    } catch {
      setError('The finance service could not be reached.');
    } finally {
      setPendingAction('');
    }
  }

  async function requestRefund(formData: FormData) {
    setError('');
    setPendingAction('REFUND');
    try {
      const response = await fetch(
        `/api/v1/admin/finance/payments/${encodeURIComponent(paymentId)}`,
        {
          body: JSON.stringify({
            amount: Number(formData.get('amount')),
            reason: formData.get('reason'),
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      );
      const result = (await readJsonResponse<ActionResponse>(response)) ?? {};
      if (!response.ok) setError(result.error ?? 'Refund request failed.');
      else router.refresh();
    } catch {
      setError('The refund service could not be reached.');
    } finally {
      setPendingAction('');
    }
  }

  return (
    <div className="admin-finance-actions">
      <form action={reconcile} className="admin-finance-actions__form">
        <input defaultValue={amount} min="1" name="providerAmount" type="number" />
        <input defaultValue={currency} maxLength={3} name="providerCurrency" />
        <input maxLength={500} name="note" placeholder="Reconciliation note" />
        <button disabled={Boolean(pendingAction)} name="status" value="MATCHED">
          {pendingAction === 'MATCHED' ? 'Saving…' : 'Mark matched'}
        </button>
        <button disabled={Boolean(pendingAction)} name="status" value="DISCREPANCY">
          {pendingAction === 'DISCREPANCY' ? 'Saving…' : 'Flag discrepancy'}
        </button>
      </form>
      <form action={requestRefund} className="admin-finance-actions__form">
        <input defaultValue={amount} max={amount} min="1" name="amount" type="number" />
        <input maxLength={500} minLength={5} name="reason" placeholder="Refund reason" required />
        <button disabled={Boolean(pendingAction)}>
          {pendingAction === 'REFUND' ? 'Creating…' : 'Create refund request'}
        </button>
      </form>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function AdminRefundActions({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function review(formData: FormData) {
    setError('');
    setIsPending(true);
    try {
      const response = await fetch(
        `/api/v1/admin/finance/refunds/${encodeURIComponent(refundId)}`,
        {
          body: JSON.stringify({ decision: formData.get('decision'), note: formData.get('note') }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      );
      const result = (await readJsonResponse<ActionResponse>(response)) ?? {};
      if (!response.ok) setError(result.error ?? 'Refund review failed.');
      else router.refresh();
    } catch {
      setError('The refund service could not be reached.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form action={review} className="admin-finance-actions__form">
      <input maxLength={500} name="note" placeholder="Decision note (required for rejection)" />
      <button disabled={isPending} name="decision" value="APPROVE">
        Approve
      </button>
      <button disabled={isPending} name="decision" value="REJECT">
        Reject
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
