'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';

type AdminCustomerSupportActionProps = {
  caseId: string;
  status: string;
};

export function AdminCustomerSupportAction({ caseId, status }: AdminCustomerSupportActionProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const action = status === 'OPEN' ? 'CLOSE' : 'REOPEN';

  async function updateCase() {
    setError('');
    setIsUpdating(true);
    try {
      const response = await fetch(
        `/api/v1/admin/customer-support/${encodeURIComponent(caseId)}`,
        {
          body: JSON.stringify({ action, resolutionNote }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      );
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The support case could not be updated.');
        return;
      }
      setResolutionNote('');
      router.refresh();
    } catch {
      setError('The support service could not be reached.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="admin-support-action">
      {action === 'CLOSE' ? (
        <div className="ui-field">
          <label className="ui-field__label" htmlFor={`resolution-${caseId}`}>
            Resolution note
          </label>
          <textarea
            className="ui-input admin-support-action__note"
            id={`resolution-${caseId}`}
            maxLength={500}
            minLength={5}
            onChange={(event) => setResolutionNote(event.target.value)}
            required
            value={resolutionNote}
          />
        </div>
      ) : null}
      <Button
        disabled={action === 'CLOSE' && resolutionNote.trim().length < 5}
        isLoading={isUpdating}
        onClick={updateCase}
        variant="secondary"
      >
        {action === 'CLOSE' ? 'Close case' : 'Reopen case'}
      </Button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
