'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';

type Props = { requestId: string; status: string; version: number };

const ACTIONS: Record<string, Array<{ action: string; label: string }>> = {
  OPEN: [{ action: 'START_REVIEW', label: 'Start review' }],
  IN_REVIEW: [
    { action: 'COMPLETE', label: 'Mark fulfilled' },
    { action: 'REJECT', label: 'Reject with reason' },
  ],
  COMPLETED: [{ action: 'REOPEN', label: 'Reopen review' }],
  REJECTED: [{ action: 'REOPEN', label: 'Reopen review' }],
};

export function AdminPrivacyRequestAction({ requestId, status, version }: Props) {
  const router = useRouter();
  const [action, setAction] = useState(ACTIONS[status]?.[0]?.action ?? '');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [note, setNote] = useState('');
  const actions = ACTIONS[status] ?? [];

  async function updateRequest() {
    setError('');
    setIsUpdating(true);
    try {
      const response = await fetch(
        `/api/v1/admin/privacy/requests/${encodeURIComponent(requestId)}`,
        {
          body: JSON.stringify({ action, note, version }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      );
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The request could not be updated.');
        return;
      }
      setNote('');
      router.refresh();
    } catch {
      setError('The privacy operations service could not be reached.');
    } finally {
      setIsUpdating(false);
    }
  }

  if (actions.length === 0) return null;
  return (
    <div className="admin-support-action">
      {actions.length > 1 ? (
        <label className="ui-field">
          <span className="ui-field__label">Review outcome</span>
          <select
            className="ui-input"
            onChange={(event) => setAction(event.target.value)}
            value={action}
          >
            {actions.map((item) => (
              <option key={item.action} value={item.action}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="ui-field">
        <span className="ui-field__label">Review note</span>
        <textarea
          className="ui-input admin-support-action__note"
          maxLength={500}
          minLength={10}
          onChange={(event) => setNote(event.target.value)}
          required
          value={note}
        />
      </label>
      <Button
        disabled={note.trim().length < 10}
        isLoading={isUpdating}
        onClick={updateRequest}
        variant="secondary"
      >
        {actions.find((item) => item.action === action)?.label ?? 'Update request'}
      </Button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
