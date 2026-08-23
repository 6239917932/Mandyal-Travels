'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

export type DestinationEditorValue = {
  bestTimeToVisit: string;
  country: string;
  heroImageUrl: string;
  highlights: string[];
  id: string;
  introduction: string;
  name: string;
  slug: string;
  state: string;
  status: string;
  summary: string;
  travelTips: string[];
  version: number;
};

type ResponseBody = { error?: string };

export function DestinationContentEditor({ value }: { value?: DestinationEditorValue }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setError('');
    setPending(true);
    const action = String(formData.get('action') ?? 'SAVE_DRAFT');
    try {
      const response = await fetch(
        value
          ? `/api/v1/admin/content/destinations/${encodeURIComponent(value.id)}`
          : '/api/v1/admin/content/destinations',
        {
          body: JSON.stringify({
            action,
            bestTimeToVisit: formData.get('bestTimeToVisit'),
            country: formData.get('country'),
            expectedVersion: value?.version ?? 0,
            heroImageUrl: formData.get('heroImageUrl'),
            highlights: formData.get('highlights'),
            introduction: formData.get('introduction'),
            name: formData.get('name'),
            reason: formData.get('reason'),
            slug: formData.get('slug'),
            state: formData.get('state'),
            summary: formData.get('summary'),
            travelTips: formData.get('travelTips'),
          }),
          headers: { 'Content-Type': 'application/json' },
          method: value ? 'PATCH' : 'POST',
        },
      );
      const result = (await readJsonResponse<ResponseBody>(response)) ?? {};
      if (!response.ok) setError(result.error ?? 'The destination content could not be saved.');
      else router.refresh();
    } catch {
      setError('The destination content service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="supplier-form">
      <div className="supplier-form__grid">
        <label>
          Destination name
          <input defaultValue={value?.name} maxLength={100} name="name" required />
        </label>
        <label>
          URL slug
          <input
            defaultValue={value?.slug}
            maxLength={80}
            name="slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="mandi-himachal-pradesh"
            required
          />
        </label>
        <label>
          State or region
          <input defaultValue={value?.state} maxLength={100} name="state" required />
        </label>
        <label>
          Country
          <input defaultValue={value?.country ?? 'India'} maxLength={80} name="country" required />
        </label>
      </div>
      <label>
        Card summary
        <textarea
          defaultValue={value?.summary}
          maxLength={240}
          minLength={30}
          name="summary"
          required
        />
      </label>
      <label>
        Introduction
        <textarea defaultValue={value?.introduction} maxLength={3000} name="introduction" />
      </label>
      <div className="supplier-form__grid">
        <label>
          Hero image URL
          <input
            defaultValue={value?.heroImageUrl}
            maxLength={1000}
            name="heroImageUrl"
            placeholder="/brand/destination.png or https://…"
          />
        </label>
        <label>
          Best time to visit
          <input defaultValue={value?.bestTimeToVisit} maxLength={240} name="bestTimeToVisit" />
        </label>
      </div>
      <div className="supplier-form__grid">
        <label>
          Highlights — one per line
          <textarea
            defaultValue={value?.highlights.join('\n')}
            maxLength={2000}
            name="highlights"
          />
        </label>
        <label>
          Travel tips — one per line
          <textarea
            defaultValue={value?.travelTips.join('\n')}
            maxLength={2000}
            name="travelTips"
          />
        </label>
      </div>
      <label>
        Required change reason
        <textarea maxLength={500} minLength={10} name="reason" required />
      </label>
      <div className="business-report__filter-actions">
        <button
          className="ui-button ui-button--secondary"
          disabled={pending}
          name="action"
          type="submit"
          value="SAVE_DRAFT"
        >
          {pending ? 'Saving…' : 'Save content'}
        </button>
        {value?.status === 'PUBLISHED' ? (
          <button
            className="ui-button ui-button--secondary"
            disabled={pending}
            name="action"
            type="submit"
            value="UNPUBLISH"
          >
            Return to draft
          </button>
        ) : (
          <button
            className="ui-button ui-button--primary"
            disabled={pending}
            name="action"
            type="submit"
            value="PUBLISH"
          >
            Publish destination
          </button>
        )}
      </div>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
