'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

type TaxProfile = {
  gstRegistrationStatus: string;
  gstin: string;
  placeOfSupplyStateCode: string;
  section194OExempt: boolean;
  section9FiveApplicable: boolean;
  version: number;
} | null;

export function AdminTaxProfileForm({
  partnerId,
  profile,
}: {
  partnerId: string;
  profile: TaxProfile;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(`/api/v1/admin/partners/${partnerId}/tax-profile`, {
        body: JSON.stringify({
          expectedVersion: profile?.version ?? 0,
          gstRegistrationStatus: values.gstRegistrationStatus,
          gstin: values.gstin,
          placeOfSupplyStateCode: values.placeOfSupplyStateCode,
          reason: values.reason,
          section194OExempt: values.section194OExempt === 'on',
          section9FiveApplicable: values.section9FiveApplicable === 'on',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      });
      const result: unknown = await response.json().catch(() => undefined);
      if (!response.ok) {
        const apiError =
          result && typeof result === 'object' && 'error' in result ? result.error : undefined;
        setError(
          apiError &&
            typeof apiError === 'object' &&
            'message' in apiError &&
            typeof apiError.message === 'string'
            ? apiError.message
            : 'Tax profile review was not saved.',
        );
        return;
      }
      router.refresh();
    } catch {
      setError('The tax-profile service could not be reached.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="supplier-form" onSubmit={submit}>
      <div className="supplier-form__grid">
        <label>
          GST status
          <select
            defaultValue={profile?.gstRegistrationStatus ?? 'REGISTERED'}
            name="gstRegistrationStatus"
            required
          >
            <option value="REGISTERED">GST registered</option>
            <option value="UNREGISTERED">Not GST registered</option>
          </select>
        </label>
        <label>
          GSTIN (registered suppliers only)
          <input
            defaultValue={profile?.gstin ?? ''}
            maxLength={15}
            name="gstin"
            placeholder="02ABCDE1234F1Z5"
          />
        </label>
        <label>
          Place-of-supply state code
          <input
            defaultValue={profile?.placeOfSupplyStateCode ?? ''}
            inputMode="numeric"
            maxLength={2}
            name="placeOfSupplyStateCode"
            placeholder="02"
            required
          />
        </label>
        <label>
          <input
            defaultChecked={profile?.section9FiveApplicable ?? false}
            name="section9FiveApplicable"
            type="checkbox"
          />{' '}
          Section 9(5) applies (unregistered hotel only)
        </label>
        <label>
          <input
            defaultChecked={profile?.section194OExempt ?? false}
            name="section194OExempt"
            type="checkbox"
          />{' '}
          Section 194-O threshold exemption verified
        </label>
      </div>
      <label>
        Review reason
        <input
          maxLength={500}
          minLength={10}
          name="reason"
          placeholder="Evidence reviewed and classification decision"
          required
        />
      </label>
      <button className="ui-button ui-button--secondary" disabled={busy} type="submit">
        {busy ? 'Saving…' : profile ? 'Save reviewed profile' : 'Verify tax profile'}
      </button>
      {error ? (
        <p className="form-status form-status--error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
