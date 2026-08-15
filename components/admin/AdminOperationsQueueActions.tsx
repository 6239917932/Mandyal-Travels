'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type ResponseBody = { error?: string };

async function update(path: string, body: object) {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  });
  const result = (await readJsonResponse<ResponseBody>(response)) ?? {};
  if (!response.ok) throw new Error(result.error ?? 'The queue action failed.');
}

export function AdminIntegrationEventActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function act(action: 'IGNORE' | 'RETRY') {
    setPending(true);
    setError('');
    try {
      await update(`/api/v1/admin/operations/integrations/${encodeURIComponent(eventId)}`, {
        action,
      });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The queue action failed.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="admin-support-action">
      <button disabled={pending} onClick={() => act('RETRY')}>
        Retry now
      </button>
      <button disabled={pending} onClick={() => act('IGNORE')}>
        Ignore
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function AdminRiskSignalActions({ signalId }: { signalId: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function act(formData: FormData) {
    setPending(true);
    setError('');
    try {
      await update(`/api/v1/admin/operations/risks/${encodeURIComponent(signalId)}`, {
        action: formData.get('action'),
        note: formData.get('note'),
      });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The risk review failed.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={act} className="admin-finance-actions__form">
      <input
        maxLength={500}
        minLength={5}
        name="note"
        placeholder="Review evidence and record outcome"
        required
      />
      <button disabled={pending} name="action" value="RESOLVE">
        Resolve
      </button>
      <button disabled={pending} name="action" value="DISMISS">
        Dismiss
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
