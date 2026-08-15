'use client';

import { useEffect, useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type MfaState = { enabled: boolean; recoveryCodesRemaining: number };

export function MfaSecurityManager() {
  const [state, setState] = useState<MfaState | null>(null);
  const [setupUri, setSetupUri] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  async function refresh() {
    const response = await fetch('/api/v1/account/mfa');
    const result = await readJsonResponse<{ data?: MfaState }>(response);
    if (response.ok && result?.data) setState(result.data);
  }

  useEffect(() => {
    // The initial server state is intentionally loaded once when this client security control mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  async function beginEnrollment() {
    setMessage('');
    const response = await fetch('/api/v1/account/mfa', { method: 'POST' });
    const result = await readJsonResponse<{ data?: { setupUri: string }; error?: string }>(
      response,
    );
    if (!response.ok || !result?.data) return setMessage(result?.error ?? 'Enrollment failed.');
    setSetupUri(result.data.setupUri);
  }

  async function confirmEnrollment() {
    const response = await fetch('/api/v1/account/mfa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const result = await readJsonResponse<{ data?: { recoveryCodes: string[] }; error?: string }>(
      response,
    );
    if (!response.ok || !result?.data) return setMessage(result?.error ?? 'Verification failed.');
    setRecoveryCodes(result.data.recoveryCodes);
    setSetupUri('');
    setMessage(
      'Two-step verification is enabled. Save every recovery code now; they are shown once.',
    );
    await refresh();
  }

  async function disableMfa() {
    if (!code) return setMessage('Enter a current authenticator or recovery code first.');
    const response = await fetch('/api/v1/account/mfa', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (response.ok) {
      setRecoveryCodes([]);
      setMessage('Two-step verification is disabled.');
      await refresh();
    }
  }

  return (
    <section className="ui-card ui-card--padded">
      <h2>Two-step verification</h2>
      <p>
        {state?.enabled
          ? `Enabled. ${state.recoveryCodesRemaining} unused recovery codes remain.`
          : 'Protect sign-in with a standards-based authenticator app.'}
      </p>
      {message ? <p role="status">{message}</p> : null}
      {setupUri ? (
        <div className="account-security__mfa-setup">
          <p>Import this setup URI into your authenticator app, then enter its six-digit code:</p>
          <code>{setupUri}</code>
          <input
            aria-label="Authenticator code"
            autoComplete="one-time-code"
            className="ui-input"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value)}
            value={code}
          />
          <button
            className="ui-button ui-button--accent"
            onClick={() => void confirmEnrollment()}
            type="button"
          >
            Verify and enable
          </button>
        </div>
      ) : state?.enabled ? (
        <div>
          <input
            aria-label="Current authenticator or recovery code"
            autoComplete="one-time-code"
            className="ui-input"
            maxLength={20}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Current authenticator or recovery code"
            value={code}
          />
          <button
            className="ui-button ui-button--secondary"
            onClick={() => void disableMfa()}
            type="button"
          >
            Disable two-step verification
          </button>
        </div>
      ) : (
        <button
          className="ui-button ui-button--accent"
          onClick={() => void beginEnrollment()}
          type="button"
        >
          Set up authenticator
        </button>
      )}
      {recoveryCodes.length ? (
        <div>
          <h3>One-time recovery codes</h3>
          <ul>
            {recoveryCodes.map((item) => (
              <li key={item}>
                <code>{item}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
