'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { readJsonResponse } from '@/lib/api/clientResponse';

export function PartnerPrivacyEvidenceForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    const response = await fetch('/api/v1/partner/privacy-evidence', {
      body: JSON.stringify({ ...Object.fromEntries(formData), requestId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = await readJsonResponse<{ error?: { message?: string } }>(response);
    setPending(false);
    setMessage(
      response.ok
        ? 'Privacy response evidence recorded for platform review.'
        : (result?.error?.message ?? 'Evidence could not be recorded.'),
    );
    if (response.ok) router.refresh();
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field">
        <span className="ui-field__label">Hotel response posture</span>
        <select className="ui-input" name="posture">
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="EVIDENCE_READY">Evidence ready for review</option>
          <option value="NO_LOCAL_RECORD_FOUND">No local record found</option>
        </select>
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Response evidence note</span>
        <textarea className="ui-input" maxLength={500} minLength={10} name="note" required />
      </label>
      <button className="ui-button ui-button--secondary" disabled={pending} type="submit">
        {pending ? 'Recording…' : 'Record response evidence'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}
