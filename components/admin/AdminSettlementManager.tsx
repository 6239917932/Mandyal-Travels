'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function AdminSettlementManager({
  partners,
  settlements,
}: {
  partners: { id: string; name: string }[];
  settlements: {
    bookingCount: number;
    currency: string;
    grossAmount: number;
    id: string;
    netAmount: number;
    partner: { name: string };
    periodEnd: string;
    periodStart: string;
    status: string;
  }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function send(endpoint: string, body: Record<string, string>, method: 'POST' | 'PATCH') {
    if (busy) return;
    setError(undefined);
    setBusy(true);
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
      setBusy(false);
    }
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(
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
        <div className="supplier-form__grid">
          <label>
            Supplier
            <select name="partnerId" required defaultValue="">
              <option value="" disabled>
                Select supplier
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
        <button className="ui-button ui-button--primary" disabled={busy} type="submit">
          {busy ? 'Working…' : 'Create draft'}
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
          {settlement.status !== 'PAID' ? (
            <form
              className="supplier-form"
              onSubmit={(event) => {
                event.preventDefault();
                const values = Object.fromEntries(
                  new FormData(event.currentTarget).entries(),
                ) as Record<string, string>;
                void send(`/api/v1/admin/settlements/${settlement.id}`, values, 'PATCH');
              }}
            >
              <input name="note" required minLength={3} maxLength={500} placeholder="Audit note" />
              <input name="paymentReference" placeholder="Payment reference (when marking paid)" />
              <button
                className="ui-button ui-button--secondary"
                disabled={busy}
                name="action"
                value={settlement.status === 'DRAFT' ? 'APPROVE' : 'MARK_PAID'}
              >
                {busy ? 'Working…' : settlement.status === 'DRAFT' ? 'Approve' : 'Mark paid'}
              </button>
            </form>
          ) : null}
        </section>
      ))}
    </div>
  );
}
