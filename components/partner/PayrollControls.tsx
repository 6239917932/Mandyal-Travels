'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { readJsonResponse } from '@/lib/api/clientResponse';

type ApiResult = { error?: { message?: string } };

export function PayrollEntryForm({
  members,
  properties,
}: {
  members: Array<{ id: string; label: string }>;
  properties: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    const response = await fetch('/api/v1/partner/payroll', {
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    setMessage(
      response.ok
        ? 'Payroll record and balanced journal posted.'
        : (result?.error?.message ?? 'Payroll could not be posted.'),
    );
    if (response.ok) router.refresh();
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field">
        <span className="ui-field__label">Property</span>
        <select className="ui-input" name="propertyId" required>
          {properties.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Named staff member</span>
        <select className="ui-input" name="memberId" required>
          {members.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Payroll month</span>
        <input className="ui-input" name="period" required type="month" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Gross pay (INR)</span>
        <input className="ui-input" min="1" name="grossAmount" required type="number" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Approved deductions (INR)</span>
        <input
          className="ui-input"
          defaultValue="0"
          min="0"
          name="deductionAmount"
          required
          type="number"
        />
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Approval note</span>
        <input className="ui-input" maxLength={240} minLength={5} name="note" required />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !members.length || !properties.length}
        type="submit"
      >
        {pending ? 'Posting…' : 'Post payroll record'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function PayrollReversal({ recordId, version }: { recordId: string; version: number }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function reverse() {
    setPending(true);
    const response = await fetch(`/api/v1/partner/payroll/${encodeURIComponent(recordId)}`, {
      body: JSON.stringify({ note, version }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    setMessage(
      response.ok
        ? 'Payroll reversed.'
        : (result?.error?.message ?? 'Payroll could not be reversed.'),
    );
    if (response.ok) router.refresh();
  }
  return (
    <div>
      <input
        aria-label="Payroll reversal reason"
        className="ui-input"
        maxLength={240}
        minLength={5}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Reversal reason"
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
