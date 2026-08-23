'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type ResponseBody = { error?: string };

export function AdminFeatureFlagControl({
  enabled,
  featureKey,
  version,
}: {
  enabled: boolean;
  featureKey: string;
  version: number;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function update(formData: FormData) {
    setError('');
    setPending(true);
    try {
      const response = await fetch(
        `/api/v1/admin/configuration/features/${encodeURIComponent(featureKey)}`,
        {
          body: JSON.stringify({
            enabled: !enabled,
            expectedVersion: version,
            reason: formData.get('reason'),
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      );
      const result = (await readJsonResponse<ResponseBody>(response)) ?? {};
      if (!response.ok) setError(result.error ?? 'The release control could not be updated.');
      else router.refresh();
    } catch {
      setError('The configuration service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={update} className="supplier-form">
      <label>
        Required change reason
        <textarea maxLength={500} minLength={10} name="reason" required />
      </label>
      <button className="ui-button ui-button--secondary" disabled={pending}>
        {pending ? 'Saving…' : enabled ? 'Pause feature' : 'Restore feature'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
