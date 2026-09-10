'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

type Allocation = { amount: string; category: string; payer: string };

const emptyAllocation = (): Allocation => ({ amount: '', category: 'CASH', payer: '' });
const newRetryKey = () => crypto.randomUUID();

async function failureMessage(response: Response, fallback: string) {
  const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
  return !response.ok || !result || !('data' in result)
    ? result && 'error' in result
      ? result.error.message
      : fallback
    : undefined;
}

function paymentMode(index: number, allocation: Allocation, update: (next: Allocation) => void) {
  return (
    <label className="ui-field">
      <span className="ui-field__label">Payer {index + 1} payment mode</span>
      <select
        className="ui-input"
        onChange={(event) => update({ ...allocation, category: event.target.value })}
        value={allocation.category}
      >
        <option value="CASH">Cash</option>
        <option value="CARD">Card at property</option>
        <option value="UPI">UPI at property</option>
        <option value="BANK_TRANSFER">Bank transfer</option>
      </select>
    </label>
  );
}

export function HotelSplitPaymentForm({
  balance,
  confirmationCode,
  hasActiveShift,
}: {
  balance: number;
  confirmationCode: string;
  hasActiveShift: boolean;
}) {
  const router = useRouter();
  const retryKey = useRef(newRetryKey());
  const [allocations, setAllocations] = useState<Allocation[]>([
    emptyAllocation(),
    emptyAllocation(),
  ]);
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const enteredTotal = allocations.reduce(
    (sum, allocation) => sum + Number(allocation.amount || 0),
    0,
  );

  function update(index: number, next: Allocation) {
    setAllocations((current) =>
      current.map((value, position) => (position === index ? next : value)),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/partner/bookings/${encodeURIComponent(confirmationCode)}/split-billing`,
        {
          body: JSON.stringify({
            action: 'SPLIT_PAYMENT',
            allocations,
            expectedBalance: balance,
          }),
          headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': retryKey.current },
          method: 'POST',
        },
      );
      const message = await failureMessage(response, 'The split payment was not recorded.');
      if (message) return setError(message);
      retryKey.current = newRetryKey();
      router.refresh();
    } catch {
      setError('The billing service could not be reached. You can safely retry.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      {allocations.map((allocation, index) => (
        <div className="supplier-form__grid supplier-form__full-width" key={index}>
          <Input
            label={`Payer ${index + 1} name or routing label`}
            maxLength={80}
            minLength={2}
            onChange={(event) => update(index, { ...allocation, payer: event.target.value })}
            required
            value={allocation.payer}
          />
          {paymentMode(index, allocation, (next) => update(index, next))}
          <Input
            label={`Payer ${index + 1} amount (whole INR)`}
            max={balance}
            min={1}
            onChange={(event) => update(index, { ...allocation, amount: event.target.value })}
            required
            type="number"
            value={allocation.amount}
          />
          {allocations.length > 2 ? (
            <Button
              onClick={() =>
                setAllocations((current) => current.filter((_, position) => position !== index))
              }
              type="button"
              variant="secondary"
            >
              Remove payer {index + 1}
            </Button>
          ) : null}
        </div>
      ))}
      <p className="supplier-form__full-width">
        Allocated: <strong>INR {enteredTotal}</strong> of INR {balance}. All allocations are posted
        together.
      </p>
      {allocations.length < 4 ? (
        <Button
          onClick={() => setAllocations((current) => [...current, emptyAllocation()])}
          type="button"
          variant="secondary"
        >
          Add another payer
        </Button>
      ) : null}
      {!hasActiveShift ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          Open a cashier shift on Billing and cashier before recording this payment.
        </p>
      ) : null}
      {error ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        className="supplier-form__full-width"
        disabled={!hasActiveShift || enteredTotal !== balance}
        isLoading={isSaving}
        type="submit"
      >
        Record complete split payment
      </Button>
    </form>
  );
}

export function HotelDiscountForm({
  balance,
  confirmationCode,
}: {
  balance: number;
  confirmationCode: string;
}) {
  const router = useRouter();
  const retryKey = useRef(newRetryKey());
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(
        `/api/v1/partner/bookings/${encodeURIComponent(confirmationCode)}/split-billing`,
        {
          body: JSON.stringify({
            action: 'DISCOUNT',
            amount: form.get('amount'),
            expectedBalance: balance,
            reason: form.get('reason'),
          }),
          headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': retryKey.current },
          method: 'POST',
        },
      );
      const message = await failureMessage(response, 'The discount was not recorded.');
      if (message) return setError(message);
      retryKey.current = newRetryKey();
      formElement.reset();
      router.refresh();
    } catch {
      setError('The billing service could not be reached. You can safely retry.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      <Input
        label="Discount amount (whole INR)"
        max={balance}
        min={1}
        name="amount"
        required
        type="number"
      />
      <Input label="Approval reason" maxLength={160} minLength={8} name="reason" required />
      <p className="supplier-form__full-width">
        The discount is an append-only ledger entry. Correct it with an audited reversal; it never
        overwrites the original charge.
      </p>
      {error ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="supplier-form__full-width" isLoading={isSaving} type="submit">
        Apply approved discount
      </Button>
    </form>
  );
}
