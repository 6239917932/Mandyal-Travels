'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

export function AdminVehicleReviewActions({
  partnerId,
  vehicleId,
}: {
  partnerId: string;
  vehicleId: string;
}) {
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function review(action: 'APPROVE' | 'REJECT' | 'PAUSE' | 'ARCHIVE') {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/v1/admin/partners/${partnerId}/vehicles/${vehicleId}`, {
        body: JSON.stringify({ action, reviewNote }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<{ data: { id: string } } | ApiErrorResponse>(response);
      if (!response.ok)
        setError(
          result && 'error' in result ? result.error.message : 'Vehicle review could not be saved.',
        );
      else router.refresh();
    } catch {
      setError('The vehicle review service could not be reached.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="supplier-form">
      <label className="ui-field">
        <span className="ui-field__label">Decision reason</span>
        <textarea
          className="ui-input supplier-form__compact-textarea"
          maxLength={500}
          onChange={(event) => setReviewNote(event.target.value)}
          value={reviewNote}
        />
      </label>
      {error ? <p className="ui-field__error">{error}</p> : null}
      <div className="manage-booking__document-actions">
        <Button disabled={busy} onClick={() => void review('APPROVE')}>
          Approve and publish
        </Button>
        <Button disabled={busy} onClick={() => void review('REJECT')} variant="secondary">
          Return for corrections
        </Button>
        <Button disabled={busy} onClick={() => void review('PAUSE')} variant="secondary">
          Pause
        </Button>
        <Button disabled={busy} onClick={() => void review('ARCHIVE')} variant="secondary">
          Archive
        </Button>
      </div>
    </div>
  );
}
