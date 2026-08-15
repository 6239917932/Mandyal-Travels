'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
export function AdminNotificationManager({
  deliveries,
}: {
  deliveries: {
    attempts: number;
    channel: string;
    id: string;
    lastError: string;
    recipient: string;
    status: string;
    template: { templateKey: string };
  }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  async function call(url: string, body?: Record<string, string>) {
    setError(undefined);
    const response = await fetch(url, {
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      method: body ? 'POST' : 'PATCH',
    });
    const result: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      setError(
        result &&
          typeof result === 'object' &&
          'error' in result &&
          result.error &&
          typeof result.error === 'object' &&
          'message' in result.error &&
          typeof result.error.message === 'string'
          ? result.error.message
          : 'Notification operation failed.',
      );
      return;
    }
    router.refresh();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void call(
      '/api/v1/admin/notifications/templates',
      Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>,
    );
  }
  return (
    <div className="partner-channel-manager">
      {error ? <p className="form-status form-status--error">{error}</p> : null}
      <form className="ui-card supplier-form" onSubmit={submit}>
        <h2>Create or version template</h2>
        <div className="supplier-form__grid">
          <input name="templateKey" required placeholder="HOTEL_BOOKING_CONFIRMED" />
          <select name="channel">
            <option>EMAIL</option>
            <option>SMS</option>
            <option>WHATSAPP</option>
            <option>PUSH</option>
          </select>
          <input name="subject" placeholder="Subject (email only)" />
          <textarea
            name="body"
            required
            minLength={5}
            maxLength={5000}
            placeholder="Template body; provider adapters render approved variables."
          />
        </div>
        <button className="ui-button ui-button--primary">Save active template</button>
      </form>
      {deliveries.map((delivery) => (
        <section className="ui-card" key={delivery.id}>
          <strong>
            {delivery.template.templateKey} · {delivery.channel} · {delivery.status}
          </strong>
          <p>
            {delivery.recipient} · {delivery.attempts} attempts
            {delivery.lastError ? ` · ${delivery.lastError}` : ''}
          </p>
          {['FAILED', 'DEAD_LETTER'].includes(delivery.status) ? (
            <button
              className="ui-button ui-button--secondary"
              onClick={() => void call(`/api/v1/admin/notifications/deliveries/${delivery.id}`)}
            >
              Retry delivery
            </button>
          ) : null}
        </section>
      ))}
    </div>
  );
}
