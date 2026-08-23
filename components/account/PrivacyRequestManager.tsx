'use client';

import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type PrivacyRequestRecord = {
  dueAt: string;
  id: string;
  requestType: string;
  requestedAt: string;
  resolutionNote: string;
  status: string;
};

export function PrivacyRequestManager({
  initialRequests,
}: {
  initialRequests: PrivacyRequestRecord[];
}) {
  const [requestType, setRequestType] = useState('ACCESS');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState<PrivacyRequestRecord[]>(initialRequests);

  async function loadRequests() {
    try {
      const response = await fetch('/api/v1/account/privacy', { cache: 'no-store' });
      const result = await readJsonResponse<{ data?: { requests: PrivacyRequestRecord[] } }>(
        response,
      );
      if (response.ok) setRequests(result?.data?.requests ?? []);
    } catch {
      // Submission remains available when the request history cannot be loaded.
    }
  }

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
    if (response.ok) await loadRequests();
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
      {requests.length ? (
        <div className="account-trips__list">
          <h3>Your recent privacy requests</h3>
          {requests.map((request) => (
            <article className="account-trip ui-card ui-card--padded" key={request.id}>
              <div className="account-trip__topline">
                <strong>{request.requestType}</strong>
                <span>{request.status.replaceAll('_', ' ')}</span>
              </div>
              <p>
                Review target:{' '}
                {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                  new Date(request.dueAt),
                )}
              </p>
              {request.resolutionNote ? (
                <p>Latest operations note: {request.resolutionNote}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
