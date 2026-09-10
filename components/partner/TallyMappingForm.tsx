'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { readJsonResponse } from '@/lib/api/clientResponse';

export function TallyMappingForm({
  accountCode,
  initialName,
  propertyId,
}: {
  accountCode: string;
  initialName: string;
  propertyId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function save() {
    setPending(true);
    setMessage('');
    const response = await fetch('/api/v1/partner/tally-mappings', {
      body: JSON.stringify({ accountCode, propertyId, tallyLedgerName: name }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = await readJsonResponse<{ error?: { message?: string } }>(response);
    setPending(false);
    setMessage(
      response.ok ? 'Mapping saved.' : (result?.error?.message ?? 'Mapping could not be saved.'),
    );
    if (response.ok) router.refresh();
  }
  return (
    <div className="manage-booking__document-actions">
      <code>{accountCode}</code>
      <input
        aria-label={`Tally ledger for ${accountCode}`}
        className="ui-input"
        maxLength={100}
        minLength={2}
        onChange={(event) => setName(event.target.value)}
        value={name}
      />
      <button
        className="ui-button ui-button--secondary ui-button--small"
        disabled={pending || name.trim().length < 2}
        onClick={() => void save()}
        type="button"
      >
        {pending ? 'Saving…' : 'Save mapping'}
      </button>
      {message ? <small aria-live="polite">{message}</small> : null}
    </div>
  );
}
