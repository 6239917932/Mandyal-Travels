'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

async function responseError(response: Response) {
  const result: unknown = await response.json().catch(() => undefined);
  if (
    result &&
    typeof result === 'object' &&
    'error' in result &&
    result.error &&
    typeof result.error === 'object' &&
    'message' in result.error &&
    typeof result.error.message === 'string'
  )
    return result.error.message;
  return 'Notification operation failed.';
}

export function AdminNotificationTemplateManager() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(undefined);
    setPending(true);
    try {
      const body = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
      const response = await fetch('/api/v1/admin/notifications/templates', {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      if (!response.ok) {
        setError(await responseError(response));
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError('The template could not be saved. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="partner-channel-manager">
      {error ? (
        <p className="form-status form-status--error" role="alert">
          {error}
        </p>
      ) : null}
      <form className="ui-card supplier-form" onSubmit={submit}>
        <h2>Create or version template</h2>
        <div className="supplier-form__grid">
          <label>
            Template key
            <input name="templateKey" placeholder="HOTEL_BOOKING_CONFIRMED" required />
          </label>
          <label>
            Delivery channel
            <select name="channel">
              <option>EMAIL</option>
              <option>SMS</option>
              <option>WHATSAPP</option>
              <option>PUSH</option>
            </select>
          </label>
          <label>
            Message subject
            <input name="subject" placeholder="Subject (email only)" />
          </label>
          <label>
            Template body
            <textarea
              maxLength={5000}
              minLength={5}
              name="body"
              placeholder="Template body; provider adapters render approved variables."
              required
            />
          </label>
        </div>
        <button className="ui-button ui-button--primary" disabled={pending}>
          {pending ? 'Saving template…' : 'Save active template'}
        </button>
      </form>
    </div>
  );
}

export function AdminNotificationRetryButton({ deliveryId }: { deliveryId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function retry() {
    setError(undefined);
    setPending(true);
    try {
      const response = await fetch(
        `/api/v1/admin/notifications/deliveries/${encodeURIComponent(deliveryId)}`,
        { method: 'PATCH' },
      );
      if (!response.ok) {
        setError(await responseError(response));
        return;
      }
      router.refresh();
    } catch {
      setError('The delivery could not be requeued. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-support-action">
      <button className="ui-button ui-button--secondary" disabled={pending} onClick={retry}>
        {pending ? 'Queuing retry…' : 'Retry delivery'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
