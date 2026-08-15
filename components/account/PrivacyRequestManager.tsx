'use client';

import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

export function PrivacyRequestManager() {
  const [requestType, setRequestType] = useState('ACCESS');
  const [message, setMessage] = useState('');

  async function submitRequest() {
    const response = await fetch('/api/v1/account/privacy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType }),
    });
    const result = await readJsonResponse<{ data?: { duplicate: boolean }; error?: string }>(
      response,
    );
    setMessage(
      response.ok
        ? result?.data?.duplicate
          ? 'An open request of this type already exists.'
          : 'Your privacy request was recorded and is due for review within 30 days.'
        : (result?.error ?? 'The request could not be recorded.'),
    );
  }

  return (
    <section className="ui-card ui-card--padded">
      <h2>Privacy and data rights</h2>
      <p>
        Download your account archive or submit a governed access, correction, deletion, or
        restriction request.
      </p>
      <a className="ui-button ui-button--secondary" href="/api/v1/account/export">
        Download my data
      </a>
      <label className="ui-field">
        <span className="ui-field__label">Request type</span>
        <select
          className="ui-input"
          onChange={(event) => setRequestType(event.target.value)}
          value={requestType}
        >
          <option value="ACCESS">Access review</option>
          <option value="CORRECTION">Correction</option>
          <option value="DELETION">Deletion</option>
          <option value="RESTRICTION">Restrict processing</option>
        </select>
      </label>
      <button
        className="ui-button ui-button--accent"
        onClick={() => void submitRequest()}
        type="button"
      >
        Submit privacy request
      </button>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
