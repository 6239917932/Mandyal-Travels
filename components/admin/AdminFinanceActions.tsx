'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type ActionResponse = { error?: string };
type ApiActionResponse = { error?: { message?: string } };

export function AdminPayoutAccountImport({
  partners,
}: {
  partners: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function importDestination(formData: FormData) {
    setError('');
    setIsPending(true);
    try {
      const response = await fetch('/api/v1/admin/finance/payout-accounts', {
        body: JSON.stringify({
          accountHolderName: formData.get('accountHolderName'),
          accountLast4: formData.get('accountLast4'),
          bankName: formData.get('bankName'),
          partnerId: formData.get('partnerId'),
          provider: formData.get('provider'),
          providerBeneficiaryRef: formData.get('providerBeneficiaryRef'),
          reason: formData.get('reason'),
          routingCodeMasked: formData.get('routingCodeMasked'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await readJsonResponse<ApiActionResponse>(response)) ?? {};
      if (!response.ok)
        setError(
          result.error?.message ?? 'The tokenized payout destination could not be imported.',
        );
      else router.refresh();
    } catch {
      setError('The payout destination service could not be reached.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form action={importDestination} className="admin-finance-actions__form">
      <select name="partnerId" required>
        <option value="">Choose supplier</option>
        {partners.map((partner) => (
          <option key={partner.id} value={partner.id}>
            {partner.name}
          </option>
        ))}
      </select>
      <input maxLength={50} name="provider" placeholder="Approved provider code" required />
      <input
        maxLength={200}
        minLength={3}
        name="providerBeneficiaryRef"
        placeholder="Provider beneficiary token"
        required
      />
      <input maxLength={120} name="accountHolderName" placeholder="Verified holder name" required />
      <input maxLength={120} name="bankName" placeholder="Bank or destination label" required />
      <input
        inputMode="numeric"
        maxLength={4}
        minLength={4}
        name="accountLast4"
        pattern="[0-9]{4}"
        placeholder="Final 4 digits only"
        required
      />
      <input maxLength={40} name="routingCodeMasked" placeholder="Masked routing code (optional)" />
      <input
        maxLength={500}
        minLength={10}
        name="reason"
        placeholder="Provider evidence and import reason"
        required
      />
      <button disabled={isPending || partners.length === 0}>
        {isPending ? 'Importing…' : 'Import tokenized destination'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

export function AdminPayoutAccountActions({
  accountId,
  version,
}: {
  accountId: string;
  version: number;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState('');

  async function review(formData: FormData) {
    const action = String(formData.get('action') ?? '');
    setError('');
    setPendingAction(action);
    try {
      const response = await fetch(
        `/api/v1/admin/finance/payout-accounts/${encodeURIComponent(accountId)}`,
        {
          body: JSON.stringify({
            action,
            expectedVersion: version,
            reason: formData.get('reason'),
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      );
      const result = (await readJsonResponse<ApiActionResponse>(response)) ?? {};
      if (!response.ok)
        setError(result.error?.message ?? 'The payout destination review could not be saved.');
      else router.refresh();
    } catch {
      setError('The payout review service could not be reached.');
    } finally {
      setPendingAction('');
    }
  }

  return (
    <form action={review} className="admin-finance-actions__form">
      <input
        maxLength={500}
        minLength={10}
        name="reason"
        placeholder="Provider evidence and decision reason"
        required
      />
      <button disabled={Boolean(pendingAction)} name="action" value="VERIFY">
        {pendingAction === 'VERIFY' ? 'Verifying…' : 'Verify destination'}
      </button>
      <button disabled={Boolean(pendingAction)} name="action" value="REJECT">
        {pendingAction === 'REJECT' ? 'Rejecting…' : 'Reject'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

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

export function AdminRefundActions({
  canReject = true,
  isRetry = false,
  refundId,
}: {
  canReject?: boolean;
  isRetry?: boolean;
  refundId: string;
}) {
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
        {isRetry ? 'Retry provider refund' : 'Approve'}
      </button>
      {canReject ? (
        <button disabled={isPending} name="decision" value="REJECT">
          Reject
        </button>
      ) : null}
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
