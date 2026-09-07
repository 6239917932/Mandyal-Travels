'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

type ActiveShift = {
  expectedCashAmount: number;
  id: string;
  openingFloatAmount: number;
  version: number;
};

function newRetryKey() {
  return crypto.randomUUID();
}

async function errorMessage(response: Response, fallback: string) {
  const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
  return !response.ok || !result || !('data' in result)
    ? result && 'error' in result
      ? result.error.message
      : fallback
    : undefined;
}

export function CashierShiftControls({
  activeShift,
  isAdmin,
  propertyId,
}: {
  activeShift?: ActiveShift;
  isAdmin: boolean;
  propertyId?: string;
}) {
  const router = useRouter();
  const retryKey = useRef(newRetryKey());
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/partner/cashier-shifts', {
        body: JSON.stringify(
          activeShift
            ? {
                action: 'CLOSE',
                declaredClosingAmount: form.get('declaredClosingAmount'),
                shiftId: activeShift.id,
                version: activeShift.version,
              }
            : {
                action: 'OPEN',
                openingFloatAmount: form.get('openingFloatAmount'),
                propertyId,
              },
        ),
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': retryKey.current,
        },
        method: 'POST',
      });
      const message = await errorMessage(response, 'The cashier shift was not updated.');
      if (message) {
        setError(message);
        return;
      }
      retryKey.current = newRetryKey();
      router.refresh();
    } catch {
      setError('The cashier service could not be reached. You can safely retry.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <p>Payment collection and cashier-shift controls require partner administrator access.</p>
    );
  }
  if (!propertyId) return <p>Add an active managed property before opening a cashier shift.</p>;

  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      {activeShift ? (
        <>
          <p className="supplier-form__full-width">
            Expected cash: <strong>INR {activeShift.expectedCashAmount}</strong> (opening float INR{' '}
            {activeShift.openingFloatAmount} plus cash receipts and reversals).
          </p>
          <Input
            defaultValue={activeShift.expectedCashAmount}
            label="Declared closing cash (whole INR)"
            max={10000000}
            min={0}
            name="declaredClosingAmount"
            required
            type="number"
          />
          <Button isLoading={isSaving} type="submit" variant="secondary">
            Reconcile and close shift
          </Button>
        </>
      ) : (
        <>
          <Input
            defaultValue={0}
            label="Opening cash float (whole INR)"
            max={10000000}
            min={0}
            name="openingFloatAmount"
            required
            type="number"
          />
          <Button isLoading={isSaving} type="submit">
            Open cashier shift
          </Button>
        </>
      )}
      {error ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function FolioPostingControls({
  activeShift,
  confirmationCode,
  isAdmin,
}: {
  activeShift?: ActiveShift;
  confirmationCode: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const retryKey = useRef(newRetryKey());
  const [entryType, setEntryType] = useState<'CHARGE' | 'PAYMENT'>('CHARGE');
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
        `/api/v1/partner/bookings/${encodeURIComponent(confirmationCode)}/folio-entries`,
        {
          body: JSON.stringify({
            action: 'POST',
            amount: form.get('amount'),
            category: form.get('category'),
            description: form.get('description'),
            entryType,
          }),
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': retryKey.current,
          },
          method: 'POST',
        },
      );
      const message = await errorMessage(response, 'The folio posting was not recorded.');
      if (message) {
        setError(message);
        return;
      }
      retryKey.current = newRetryKey();
      formElement.reset();
      setEntryType('CHARGE');
      router.refresh();
    } catch {
      setError('The folio service could not be reached. You can safely retry.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      <label className="ui-field">
        <span className="ui-field__label">Posting type</span>
        <select
          className="ui-input"
          name="entryType"
          onChange={(event) => setEntryType(event.target.value as 'CHARGE' | 'PAYMENT')}
          value={entryType}
        >
          <option value="CHARGE">Guest charge</option>
          {isAdmin ? <option value="PAYMENT">Payment received</option> : null}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Category</span>
        <select className="ui-input" key={entryType} name="category" required>
          {entryType === 'CHARGE' ? (
            <>
              <option value="ROOM_SERVICE">Room service</option>
              <option value="FOOD_AND_BEVERAGE">Food and beverage</option>
              <option value="LAUNDRY">Laundry</option>
              <option value="MINIBAR">Minibar</option>
              <option value="DAMAGE">Damage</option>
              <option value="OTHER">Other</option>
            </>
          ) : (
            <>
              <option value="CASH">Cash</option>
              <option value="CARD">Card at property</option>
              <option value="UPI">UPI at property</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
            </>
          )}
        </select>
      </label>
      <Input
        label="Amount (whole INR)"
        max={10000000}
        min={1}
        name="amount"
        required
        type="number"
      />
      <Input
        label="Posting description"
        maxLength={160}
        minLength={3}
        name="description"
        required
      />
      {entryType === 'PAYMENT' && !activeShift ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          Open a cashier shift for this property before recording a payment.
        </p>
      ) : null}
      {error ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        className="supplier-form__full-width"
        disabled={entryType === 'PAYMENT' && !activeShift}
        isLoading={isSaving}
        type="submit"
      >
        Post {entryType === 'CHARGE' ? 'charge' : 'payment'}
      </Button>
    </form>
  );
}

export function FolioReversalButton({
  confirmationCode,
  entryId,
}: {
  confirmationCode: string;
  entryId: string;
}) {
  const router = useRouter();
  const retryKey = useRef(newRetryKey());
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/v1/partner/bookings/${encodeURIComponent(confirmationCode)}/folio-entries`,
        {
          body: JSON.stringify({ action: 'REVERSE', entryId, reason: form.get('reason') }),
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': retryKey.current,
          },
          method: 'POST',
        },
      );
      const message = await errorMessage(response, 'The correction was not recorded.');
      if (message) {
        setError(message);
        return;
      }
      retryKey.current = newRetryKey();
      router.refresh();
    } catch {
      setError('The folio service could not be reached. You can safely retry.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      <Input label="Correction reason" maxLength={240} minLength={8} name="reason" required />
      <Button isLoading={isSaving} type="submit" variant="secondary">
        Post reversal
      </Button>
      {error ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
