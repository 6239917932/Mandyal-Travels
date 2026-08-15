'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

type HousekeepingStatus = 'CLEANING' | 'DIRTY' | 'READY';
type OperationalStatus = 'ACTIVE' | 'OUT_OF_SERVICE';

export function HousekeepingRoomActions({
  housekeepingStatus,
  operationalStatus,
  physicalRoomId,
  propertyId,
  roomId,
}: {
  housekeepingStatus: string;
  operationalStatus: string;
  physicalRoomId: string;
  propertyId: string;
  roomId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function update(nextHousekeeping: HousekeepingStatus, nextOperational: OperationalStatus) {
    setError(undefined);
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/partner/properties/${propertyId}/rooms/${roomId}/physical-rooms/${physicalRoomId}`,
        {
          body: JSON.stringify({
            housekeepingStatus: nextHousekeeping,
            operationalStatus: nextOperational,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      );
      const result = await readJsonResponse<{ data: { id: string } } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(result && 'error' in result ? result.error.message : 'The room status could not be saved.');
        return;
      }
      router.refresh();
    } catch {
      setError('The housekeeping service could not be reached.');
    } finally {
      setIsSaving(false);
    }
  }

  const active = operationalStatus === 'ACTIVE';
  return (
    <div>
      <div className="manage-booking__document-actions">
        {housekeepingStatus !== 'CLEANING' ? (
          <Button disabled={isSaving || !active} onClick={() => void update('CLEANING', 'ACTIVE')} variant="secondary">
            Start cleaning
          </Button>
        ) : null}
        {housekeepingStatus !== 'READY' ? (
          <Button disabled={isSaving || !active} onClick={() => void update('READY', 'ACTIVE')} variant="secondary">
            Mark ready
          </Button>
        ) : null}
        {housekeepingStatus !== 'DIRTY' ? (
          <Button disabled={isSaving || !active} onClick={() => void update('DIRTY', 'ACTIVE')} variant="secondary">
            Mark dirty
          </Button>
        ) : null}
        <Button
          disabled={isSaving}
          onClick={() => void update(
            housekeepingStatus as HousekeepingStatus,
            active ? 'OUT_OF_SERVICE' : 'ACTIVE',
          )}
          variant="secondary"
        >
          {active ? 'Take out of service' : 'Return to service'}
        </Button>
      </div>
      {error ? <p className="ui-field__error" role="alert">{error}</p> : null}
    </div>
  );
}
