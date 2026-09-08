'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

export function GuestRegistrationForm({
  confirmationCode,
  defaultGuestName,
}: {
  confirmationCode: string;
  defaultGuestName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(
        `/api/v1/partner/bookings/${encodeURIComponent(confirmationCode)}/guest-registrations`,
        {
          body: JSON.stringify({
            consentRecorded: form.get('consentRecorded') === 'on',
            guestName: form.get('guestName'),
            identityLast4: form.get('identityLast4'),
            identityType: form.get('identityType'),
            nationalityCountryCode: form.get('nationalityCountryCode'),
            residenceCity: form.get('residenceCity'),
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      );
      const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result ? result.error.message : 'Registration was not saved.',
        );
        return;
      }
      formElement.reset();
      router.refresh();
    } catch {
      setError('The partner service could not be reached.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      <Input
        defaultValue={defaultGuestName}
        label="Guest name on document"
        maxLength={100}
        name="guestName"
        required
      />
      <Input
        autoCapitalize="characters"
        label="Nationality country code"
        maxLength={2}
        name="nationalityCountryCode"
        pattern="[A-Za-z]{2}"
        placeholder="IN"
        required
      />
      <Input label="City of residence" maxLength={80} name="residenceCity" required />
      <label className="ui-field">
        <span className="ui-field__label">Inspected identity document</span>
        <select className="ui-input" name="identityType" required>
          <option value="">Choose document type</option>
          <option value="AADHAAR_LAST4">Aadhaar — last 4 digits only</option>
          <option value="PASSPORT_LAST4">Passport — last 4 characters only</option>
          <option value="DRIVING_LICENCE_LAST4">Driving licence — last 4 characters only</option>
          <option value="VOTER_ID_LAST4">Voter ID — last 4 characters only</option>
        </select>
      </label>
      <Input
        autoCapitalize="characters"
        label="Final four characters only"
        maxLength={4}
        minLength={4}
        name="identityLast4"
        pattern="[A-Za-z0-9]{4}"
        required
      />
      <label className="supplier-amenities__option supplier-form__full-width">
        <input name="consentRecorded" required type="checkbox" />
        <span>
          I confirm the original document was inspected at the property and the guest was informed
          of this limited record, with consent or another lawful basis recorded.
        </span>
      </label>
      <p className="supplier-form__full-width">
        Do not enter a full identity number and do not upload a document image here.
      </p>
      {error ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="supplier-form__full-width" isLoading={isSaving} type="submit">
        Record verified guest reference
      </Button>
    </form>
  );
}
