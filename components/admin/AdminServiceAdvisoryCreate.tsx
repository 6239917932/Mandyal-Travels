'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import {
  SERVICE_ADVISORY_SEVERITIES,
  SERVICE_ADVISORY_SURFACES,
} from '@/services/serviceAdvisoryPolicy';

type ResponseBody = { error?: string };

export function AdminServiceAdvisoryCreate() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function create(formData: FormData) {
    setError('');
    setPending(true);
    try {
      const startsAt = String(formData.get('startsAt') ?? '');
      const endsAt = String(formData.get('endsAt') ?? '');
      const response = await fetch('/api/v1/admin/service-advisories', {
        body: JSON.stringify({
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          message: formData.get('message'),
          reason: formData.get('reason'),
          severity: formData.get('severity'),
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          status: formData.get('status'),
          surface: formData.get('surface'),
          title: formData.get('title'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await readJsonResponse<ResponseBody>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The service advisory could not be created.');
      } else {
        const form = document.querySelector<HTMLFormElement>('#service-advisory-create-form');
        form?.reset();
        router.refresh();
      }
    } catch {
      setError('The service advisory service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      action={create}
      className="supplier-form advisory-admin-form"
      id="service-advisory-create-form"
    >
      <div className="advisory-admin-form__grid">
        <label>
          Customer-facing title
          <input maxLength={120} minLength={5} name="title" required />
        </label>
        <label>
          Severity
          <select defaultValue="INFO" name="severity">
            {SERVICE_ADVISORY_SEVERITIES.map((severity) => (
              <option key={severity}>{severity}</option>
            ))}
          </select>
        </label>
        <label>
          Portal surface
          <select defaultValue="ALL" name="surface">
            {SERVICE_ADVISORY_SURFACES.map((surface) => (
              <option key={surface}>{surface}</option>
            ))}
          </select>
        </label>
        <label>
          Initial state
          <select defaultValue="DRAFT" name="status">
            <option>DRAFT</option>
            <option>SCHEDULED</option>
            <option>ACTIVE</option>
          </select>
        </label>
        <label>
          Starts at (required for scheduled)
          <input name="startsAt" type="datetime-local" />
        </label>
        <label>
          Ends at (optional)
          <input name="endsAt" type="datetime-local" />
        </label>
      </div>
      <label>
        Customer-facing message
        <textarea maxLength={500} minLength={10} name="message" required />
      </label>
      <label>
        Required audit reason
        <textarea maxLength={500} minLength={10} name="reason" required />
      </label>
      <button className="ui-button ui-button--primary" disabled={pending}>
        {pending ? 'Creating…' : 'Create advisory'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
