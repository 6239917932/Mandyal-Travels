'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ServiceAdvisoryStatus } from '@/services/serviceAdvisoryPolicy';

type ResponseBody = { error?: string };

export function AdminServiceAdvisoryActions({
  advisoryId,
  allowedStatuses,
  version,
}: {
  advisoryId: string;
  allowedStatuses: ServiceAdvisoryStatus[];
  version: number;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (allowedStatuses.length === 0) return <span>No further lifecycle actions</span>;

  async function update(formData: FormData) {
    setError('');
    setPending(true);
    try {
      const response = await fetch(
        `/api/v1/admin/service-advisories/${encodeURIComponent(advisoryId)}`,
        {
          body: JSON.stringify({
            expectedVersion: version,
            reason: formData.get('reason'),
            targetStatus: formData.get('targetStatus'),
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      );
      const result = (await readJsonResponse<ResponseBody>(response)) ?? {};
      if (!response.ok) setError(result.error ?? 'The advisory could not be updated.');
      else router.refresh();
    } catch {
      setError('The service advisory service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={update} className="supplier-form advisory-admin-action">
      <label>
        Next state
        <select name="targetStatus">
          {allowedStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <label>
        Required reason
        <textarea maxLength={500} minLength={10} name="reason" required />
      </label>
      <button className="ui-button ui-button--secondary" disabled={pending}>
        {pending ? 'Saving…' : 'Apply lifecycle change'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
