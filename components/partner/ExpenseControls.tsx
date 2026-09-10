'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

const categories = [
  'FOOD_SUPPLIES',
  'HOUSEKEEPING',
  'MAINTENANCE',
  'UTILITIES',
  'MARKETING',
  'TRANSPORT',
  'OTHER',
];
type ApiResult = { error?: { message?: string } };

export function ExpenseEntryForm({
  properties,
}: {
  properties: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    const response = await fetch('/api/v1/partner/expenses', {
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
      method: 'POST',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    setMessage(
      response.ok
        ? 'Expense posted to the balanced journal.'
        : (result?.error?.message ?? 'The expense could not be posted.'),
    );
    if (response.ok) router.refresh();
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field">
        <span className="ui-field__label">Property</span>
        <select className="ui-input" name="propertyId" required>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Business date</span>
        <input className="ui-input" name="businessDate" required type="date" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Category</span>
        <select className="ui-input" name="category">
          {categories.map((category) => (
            <option key={category} value={category}>
              {category.toLowerCase().replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Amount (INR)</span>
        <input className="ui-input" min="1" name="amount" required type="number" />
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Description</span>
        <input className="ui-input" maxLength={240} minLength={5} name="description" required />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !properties.length}
        type="submit"
      >
        {pending ? 'Posting…' : 'Post expense'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function ExpenseReversalButton({ journalId }: { journalId: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function reverse() {
    setPending(true);
    const response = await fetch(`/api/v1/partner/expenses/${encodeURIComponent(journalId)}`, {
      body: JSON.stringify({ note }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    setMessage(
      response.ok
        ? 'Expense reversed with a balancing journal.'
        : (result?.error?.message ?? 'The expense could not be reversed.'),
    );
    if (response.ok) router.refresh();
  }
  return (
    <div className="manage-booking__document-actions">
      <input
        aria-label="Reversal reason"
        className="ui-input"
        maxLength={240}
        minLength={5}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Reason for reversal"
        value={note}
      />
      <button
        className="ui-button ui-button--secondary ui-button--small"
        disabled={pending || note.trim().length < 5}
        onClick={() => void reverse()}
        type="button"
      >
        {pending ? 'Reversing…' : 'Reverse'}
      </button>
      {message ? <small aria-live="polite">{message}</small> : null}
    </div>
  );
}
