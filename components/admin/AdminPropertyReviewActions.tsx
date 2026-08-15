'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

export function AdminPropertyReviewActions({
  partnerId,
  propertyId,
}: {
  partnerId: string;
  propertyId: string;
}) {
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function review(action: 'APPROVE' | 'REJECT') {
    setError(undefined);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/admin/partners/${partnerId}/properties/${propertyId}`, {
        body: JSON.stringify({ action, reviewNote }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<{ data: { id: string } } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result
            ? result.error.message
            : 'The property review could not be saved.',
        );
        return;
      }
      router.refresh();
    } catch {
      setError('The property review service could not be reached.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="supplier-form">
      <label className="ui-field">
        <span className="ui-field__label">Review note</span>
        <textarea
          className="ui-input supplier-form__compact-textarea"
          maxLength={500}
          onChange={(event) => setReviewNote(event.target.value)}
          placeholder="Approval context or corrections required"
          value={reviewNote}
        />
      </label>
      {error ? <p className="ui-field__error">{error}</p> : null}
      <div className="manage-booking__document-actions">
        <Button disabled={isSaving} onClick={() => void review('APPROVE')}>
          Approve and publish
        </Button>
        <Button disabled={isSaving} onClick={() => void review('REJECT')} variant="secondary">
          Return for corrections
        </Button>
      </div>
    </div>
  );
}
