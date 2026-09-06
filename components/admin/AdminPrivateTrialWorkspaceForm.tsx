'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

export function AdminPrivateTrialWorkspaceForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function grant(formData: FormData) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/v1/admin/partners/trial-workspaces', {
        body: JSON.stringify({
          confirmation: formData.get('confirmation'),
          email: formData.get('email'),
          reason: formData.get('reason'),
          workspaceName: formData.get('workspaceName'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<
        { data: { accountEmail: string; workspaceName: string } } | ApiErrorResponse
      >(response);
      if (!response.ok || !result || 'error' in result) {
        setError(result && 'error' in result ? result.error.message : 'Trial access grant failed.');
        return;
      }
      setSuccess(`${result.data.workspaceName} is ready for ${result.data.accountEmail}.`);
      router.refresh();
    } catch {
      setError('The private trial provisioning service could not be reached.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={grant} className="supplier-form">
      <div className="supplier-form__grid">
        <label>
          Verified trial account email
          <input autoComplete="off" maxLength={254} name="email" required type="email" />
        </label>
        <label>
          PMS workspace name
          <input maxLength={120} minLength={2} name="workspaceName" required />
        </label>
      </div>
      <label>
        Internal trial reason
        <textarea maxLength={500} minLength={10} name="reason" required />
      </label>
      <label>
        Confirm by typing the exact trial email
        <input autoComplete="off" maxLength={254} name="confirmation" required type="email" />
      </label>
      <p>
        This grants a private hotel PMS workspace only. It does not approve KYC, publish inventory,
        collect payments, or enable payouts.
      </p>
      <button className="ui-button ui-button--primary" disabled={busy}>
        {busy ? 'Granting private access…' : 'Grant private PMS trial'}
      </button>
      {success ? (
        <span className="auth-form__success" role="status">
          {success}
        </span>
      ) : null}
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
