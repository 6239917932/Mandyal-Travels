'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

type SettlementEvent = {
  action: string;
  actorName: string;
  createdAt: string;
  fromStatus: string;
  note: string;
  toStatus: string;
  version: number;
};

type Settlement = {
  bookingCount: number;
  currency: string;
  events: SettlementEvent[];
  grossAmount: number;
  id: string;
  netAmount: number;
  partner: { name: string };
  paymentReference: string;
  periodEnd: string;
  periodStart: string;
  status: string;
  version: number;
};

function date(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function AdminSettlementManager({
  partners,
  settlements,
}: {
  partners: { id: string; name: string }[];
  settlements: Settlement[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busyId, setBusyId] = useState<string>();
  async function send(
    operationId: string,
    endpoint: string,
    body: Record<string, string>,
    method: 'POST' | 'PATCH',
  ) {
    if (busyId) return;
    setError(undefined);
    setBusyId(operationId);
    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method,
      });
      const result: unknown = await response.json().catch(() => undefined);
      if (!response.ok) {
        const apiError =
          result && typeof result === 'object' && 'error' in result ? result.error : undefined;
        setError(
          typeof apiError === 'string'
            ? apiError
            : apiError &&
                typeof apiError === 'object' &&
                'message' in apiError &&
                typeof apiError.message === 'string'
              ? apiError.message
              : 'Settlement operation failed.',
        );
        return;
      }
      router.refresh();
    } catch {
      setError('The settlement service could not be reached. No action was recorded.');
    } finally {
      setBusyId(undefined);
    }
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(
      'create',
      '/api/v1/admin/settlements',
      Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>,
      'POST',
    );
  }
  return (
    <div className="partner-channel-manager">
      {error ? (
        <p className="form-status form-status--error" role="alert">
          {error}
        </p>
      ) : null}
      <form className="supplier-form ui-card" onSubmit={create}>
        <h2>Calculate settlement</h2>
        <p>
          Bookings with unresolved refunds are held back automatically until finance review ends.
        </p>
        <div className="supplier-form__grid">
          <label>
            Supplier
            <select name="partnerId" required defaultValue="">
              <option value="" disabled>
                Select active supplier
              </option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Period start
            <input name="periodStart" required type="date" />
          </label>
          <label>
            Period end
            <input name="periodEnd" required type="date" />
          </label>
        </div>
        <button className="ui-button ui-button--primary" disabled={Boolean(busyId)} type="submit">
          {busyId === 'create' ? 'Working…' : 'Create draft'}
        </button>
      </form>

      {settlements.map((settlement) => (
        <section className="ui-card partner-channel-card" key={settlement.id}>
          <h3>
            {settlement.partner.name} · {settlement.periodStart} – {settlement.periodEnd}
          </h3>
          <p>
            {settlement.bookingCount} bookings · Gross {settlement.currency}{' '}
            {settlement.grossAmount.toLocaleString('en-IN')} · Net {settlement.currency}{' '}
            {settlement.netAmount.toLocaleString('en-IN')} · <strong>{settlement.status}</strong>
          </p>
          <small>
            Record version {settlement.version}
            {settlement.paymentReference ? ` · Payment ${settlement.paymentReference}` : ''}
          </small>
          {settlement.status !== 'PAID' ? (
            <form
              className="supplier-form"
              onSubmit={(event) => {
                event.preventDefault();
                const values = Object.fromEntries(
                  new FormData(event.currentTarget).entries(),
                ) as Record<string, string>;
                void send(
                  settlement.id,
                  `/api/v1/admin/settlements/${settlement.id}`,
                  values,
                  'PATCH',
                );
              }}
            >
              <input name="expectedVersion" type="hidden" value={settlement.version} />
              <label>
                Audit note
                <input
                  name="note"
                  required
                  minLength={10}
                  maxLength={500}
                  placeholder="Explain the reviewed evidence"
                />
              </label>
              {settlement.status === 'APPROVED' ? (
                <label>
                  Payment reference
                  <input
                    name="paymentReference"
                    required
                    minLength={3}
                    maxLength={100}
                    pattern="[A-Za-z0-9][A-Za-z0-9._:/-]{2,99}"
                  />
                </label>
              ) : null}
              <button
                className="ui-button ui-button--secondary"
                disabled={Boolean(busyId)}
                name="action"
                value={settlement.status === 'DRAFT' ? 'APPROVE' : 'MARK_PAID'}
              >
                {busyId === settlement.id
                  ? 'Working…'
                  : settlement.status === 'DRAFT'
                    ? 'Approve'
                    : 'Mark paid'}
              </button>
            </form>
          ) : null}
          <details>
            <summary>Recent audit history ({settlement.events.length})</summary>
            {settlement.events.map((event) => (
              <p key={`${event.version}-${event.action}`}>
                <strong>{event.action}</strong> · {event.fromStatus} → {event.toStatus} ·{' '}
                {event.actorName} · {date(event.createdAt)}
                <br />
                <small>
                  {event.note} · version {event.version}
                </small>
              </p>
            ))}
            {settlement.events.length === 0 ? (
              <p>Legacy record: no transition history is available.</p>
            ) : null}
          </details>
        </section>
      ))}
      {settlements.length === 0 ? (
        <div className="ui-card admin-empty-state">
          <strong>No matching settlements.</strong>
        </div>
      ) : null}
    </div>
  );
}
