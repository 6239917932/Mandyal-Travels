'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';
import {
  PARTNER_AGREEMENTS,
  PARTNER_AGREEMENT_VERSION,
  type PartnerAgreementType,
} from '@/lib/partner/partnerAgreementPolicy';

export function PartnerApplicationForm({
  defaultEmail,
  defaultName,
}: {
  defaultEmail: string;
  defaultName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [partnerType, setPartnerType] = useState<PartnerAgreementType>('HOTEL');
  const agreement = PARTNER_AGREEMENTS[partnerType];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/partners/applications', {
        body: JSON.stringify(Object.fromEntries(form)),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<{ data: { id: string } } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result
            ? result.error.message
            : 'The request could not be submitted.',
        );
        return;
      }
      router.refresh();
    } catch {
      setError('The partner onboarding service could not be reached.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="auth-form ui-card ui-card--padded" onSubmit={submit}>
      <div className="auth-form__row">
        <Input label="Business name" maxLength={120} name="businessName" required />
        <label className="ui-field">
          <span className="ui-field__label">Supplier channel</span>
          <select
            className="ui-input"
            name="partnerType"
            onChange={(event) => setPartnerType(event.target.value as PartnerAgreementType)}
            required
            value={partnerType}
          >
            <option value="HOTEL">Hotel owner or property manager</option>
            <option value="CAR">Car owner or fleet operator</option>
            <option value="BUS">Bus operator</option>
          </select>
        </label>
      </div>
      <div className="auth-form__row">
        <Input
          defaultValue={defaultName}
          label="Primary contact"
          maxLength={120}
          name="contactName"
          required
        />
        <Input
          defaultValue={defaultEmail}
          label="Business email"
          maxLength={200}
          name="contactEmail"
          required
          type="email"
        />
      </div>
      <div className="auth-form__row">
        <Input
          label="Signatory role or authority"
          maxLength={100}
          name="signingAuthority"
          placeholder="Example: Owner, Director, authorised manager"
          required
        />
        <Input
          label="Operating licence or permit number"
          maxLength={80}
          name="operatingLicenceNumber"
          required
        />
      </div>
      <div className="auth-form__row">
        <Input
          label="Licence or permit issuing authority"
          maxLength={120}
          name="operatingLicenceIssuer"
          required
        />
        <Input
          label="Licence expiry (leave blank if no expiry)"
          name="operatingLicenceExpiresOn"
          type="date"
        />
      </div>
      <div className="auth-form__row">
        <Input
          label={`${partnerType === 'HOTEL' ? 'Public liability / business' : 'Vehicle'} insurance policy number${partnerType === 'HOTEL' ? ' (if applicable)' : ''}`}
          maxLength={80}
          name="insurancePolicyNumber"
          required={partnerType !== 'HOTEL'}
        />
        <Input
          label={`Insurance provider${partnerType === 'HOTEL' ? ' (if applicable)' : ''}`}
          maxLength={120}
          name="insuranceProvider"
          required={partnerType !== 'HOTEL'}
        />
      </div>
      <Input
        label="Insurance expiry (if applicable)"
        name="insuranceExpiresOn"
        required={partnerType !== 'HOTEL'}
        type="date"
      />
      <div className="auth-form__row">
        <Input label="Phone number" maxLength={30} name="contactPhone" required type="tel" />
        <Input label="Operating city" maxLength={100} name="city" required />
      </div>
      <div className="auth-form__row">
        <Input label="Legal business name" maxLength={160} name="legalBusinessName" required />
        <Input label="Business registration number" maxLength={60} name="registrationId" required />
      </div>
      <div className="auth-form__row">
        <Input label="PAN or GSTIN" maxLength={15} name="taxIdentifier" required />
        <label className="ui-field">
          <span className="ui-field__label">Authorized representative ID type</span>
          <select className="ui-input" name="identityType" required>
            <option value="">Choose document type</option>
            <option value="AADHAAR_LAST4">Aadhaar (last 4 digits only)</option>
            <option value="PASSPORT">Passport reference</option>
            <option value="DRIVING_LICENCE">Driving licence reference</option>
          </select>
        </label>
      </div>
      <div className="auth-form__row">
        <Input
          label="Identity document reference"
          maxLength={40}
          name="identityReference"
          required
        />
        <Input
          label="Registered business address"
          maxLength={300}
          name="registeredAddress"
          required
        />
      </div>
      <label className="ui-field">
        <span className="ui-field__label">Inventory summary</span>
        <textarea
          className="ui-input partner-application__textarea"
          maxLength={600}
          minLength={20}
          name="inventorySummary"
          placeholder="Example: 28-room hotel in Jaipur, or 12 self-drive cars operating from Delhi."
          required
        />
      </label>
      <p className="business-policy__note">
        Submitting this form does not grant supplier access. Mandyal Travels verifies and activates
        every supplier account.
      </p>
      <div className="ui-card ui-card--padded">
        <strong>{agreement.title}</strong>
        <p>
          Review version {PARTNER_AGREEMENT_VERSION} before submitting. A copy will also be emailed
          to you for signature and return.
        </p>
        <a href={agreement.documentPath} rel="noreferrer" target="_blank">
          Download and review the agreement
        </a>
      </div>
      <label className="supplier-form__checkbox">
        <input name="kycConsent" required type="checkbox" />
        <span>
          I confirm I am authorized to submit these verification details and consent to their use
          for supplier due diligence.
        </span>
      </label>
      <label className="supplier-form__checkbox">
        <input name="ackAuthority" required type="checkbox" />
        <span>I am authorised to bind the applying business and submit this application.</span>
      </label>
      <label className="supplier-form__checkbox">
        <input name="ackAgreement" required type="checkbox" />
        <span>I have read and accept the applicable versioned partner agreement.</span>
      </label>
      <label className="supplier-form__checkbox">
        <input name="ackIdentity" required type="checkbox" />
        <span>The identity and signing-authority information supplied is genuine and current.</span>
      </label>
      <label className="supplier-form__checkbox">
        <input name="ackOperatingRecords" required type="checkbox" />
        <span>
          I will keep all applicable licences, permits, registrations, insurance, tax, safety,
          vehicle, driver and operating records valid and produce them promptly when required by
          Mandyal Travels or a competent authority.
        </span>
      </label>
      <label className="supplier-form__checkbox">
        <input name="ackElectronicDelivery" required type="checkbox" />
        <span>I consent to receive this agreement and verification notices electronically.</span>
      </label>
      <label className="supplier-form__checkbox">
        <input name="ackSignedReturn" required type="checkbox" />
        <span>
          I will sign or e-sign the complete agreement, stamp it if available, and return it from
          the registered business email.
        </span>
      </label>
      <label className="supplier-form__checkbox">
        <input name="ackApprovalGate" required type="checkbox" />
        <span>I understand that submission does not create approval or listing rights.</span>
      </label>
      <label className="supplier-form__checkbox">
        <input name="ackMaterialChanges" required type="checkbox" />
        <span>
          I will promptly notify Mandyal Travels of material compliance or ownership changes.
        </span>
      </label>
      <label className="supplier-form__checkbox">
        <input name="ackServiceResponsibility" required type="checkbox" />
        <span>
          I accept responsibility for safely and lawfully delivering the accommodation or transport
          service and for acts and omissions within the supplier&apos;s control.
        </span>
      </label>
      {error ? (
        <p className="booking-page__payment-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button fullWidth isLoading={saving} type="submit" variant="accent">
        Submit for verification
      </Button>
    </form>
  );
}
