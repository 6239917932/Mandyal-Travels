'use client';

import { type FormEvent, useState } from 'react';
import { readJsonResponse } from '@/lib/api/clientResponse';

export function AgencyCustomerManager() {
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/v1/agent/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const result = await readJsonResponse<{ error?: string }>(response);
    setMessage(
      response.ok
        ? 'Customer profile added to the agency workspace.'
        : (result?.error ?? 'Customer could not be added.'),
    );
    if (response.ok) event.currentTarget.reset();
  }
  return (
    <form className="ui-card ui-card--padded" onSubmit={submit}>
      <h2>Add agency customer</h2>
      <p>Store only the contact information needed to prepare and service travel.</p>
      <input className="ui-input" name="displayName" placeholder="Customer name" required />
      <input className="ui-input" name="email" placeholder="Email" required type="email" />
      <input className="ui-input" name="phone" placeholder="Phone (optional)" />
      <textarea
        className="ui-input"
        maxLength={500}
        name="notes"
        placeholder="Service notes (optional)"
      />
      <button className="ui-button ui-button--accent">Add customer</button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
