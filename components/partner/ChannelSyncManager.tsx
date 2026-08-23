'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

type PropertyOption = { displayName: string; id: string };
type SyncRun = {
  conflictCount: number;
  createdAt: string;
  direction: string;
  id: string;
  reconciliationNote: string;
  status: string;
};
type Mapping = {
  externalPropertyRef: string;
  id: string;
  property: { displayName: string };
  status: string;
};
type Connection = {
  externalAccountRef: string;
  id: string;
  propertyMappings: Mapping[];
  providerName: string;
  status: string;
  syncRuns: SyncRun[];
};

export function ChannelSyncManager({
  connections,
  properties,
}: {
  connections: Connection[];
  properties: PropertyOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>, endpoint: string, success: string) {
    event.preventDefault();
    if (busy) return;
    setError(undefined);
    setMessage(undefined);
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result: unknown = await response.json().catch(() => undefined);
      if (!response.ok) {
        const apiError =
          result && typeof result === 'object' && 'error' in result ? result.error : undefined;
        const detail =
          typeof apiError === 'string'
            ? apiError
            : apiError &&
                typeof apiError === 'object' &&
                'message' in apiError &&
                typeof apiError.message === 'string'
              ? apiError.message
              : 'The request could not be completed.';
        setError(detail);
        return;
      }
      form.reset();
      setMessage(success);
      router.refresh();
    } catch {
      setError('The channel service could not be reached. No operation was queued.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="partner-channel-manager">
      {error ? (
        <p className="form-status form-status--error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="form-status form-status--success" role="status">
          {message}
        </p>
      ) : null}
      <form
        className="supplier-form"
        onSubmit={(event) =>
          void submit(
            event,
            '/api/v1/partner/channels',
            'Connection shell created. Configure its credentials in the deployment secret store.',
          )
        }
      >
        <h2>Add channel connection</h2>
        <p>
          No passwords or API keys are stored here. This creates governed provider metadata only.
        </p>
        <div className="supplier-form__grid">
          <label>
            Provider name
            <input
              name="providerName"
              required
              minLength={2}
              maxLength={80}
              placeholder="SiteMinder, STAAH, AxisRooms"
            />
          </label>
          <label>
            External account reference
            <input
              name="externalAccountRef"
              required
              minLength={2}
              maxLength={100}
              placeholder="account-123"
            />
          </label>
        </div>
        <button className="ui-button ui-button--primary" disabled={busy} type="submit">
          {busy ? 'Working…' : 'Create connection'}
        </button>
      </form>

      {connections.map((connection) => (
        <section className="ui-card partner-channel-card" key={connection.id}>
          <div>
            <span className="admin-status-badge">{connection.status.replaceAll('_', ' ')}</span>
            <h2>{connection.providerName}</h2>
            <p>Account reference: {connection.externalAccountRef}</p>
          </div>
          <form
            className="supplier-form"
            onSubmit={(event) =>
              void submit(event, '/api/v1/partner/channels/mappings', 'Property mapping saved.')
            }
          >
            <input name="connectionId" type="hidden" value={connection.id} />
            <div className="supplier-form__grid">
              <label>
                Property
                <select name="propertyId" required defaultValue="">
                  <option value="" disabled>
                    Select property
                  </option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                External property reference
                <input name="externalPropertyRef" required minLength={2} maxLength={100} />
              </label>
            </div>
            <button className="ui-button ui-button--secondary" disabled={busy} type="submit">
              {busy ? 'Working…' : 'Save mapping'}
            </button>
          </form>
          <div className="partner-channel-mappings">
            <h3>Property mappings</h3>
            {connection.propertyMappings.map((mapping) => (
              <p key={mapping.id}>
                <strong>{mapping.property.displayName}</strong> → {mapping.externalPropertyRef} ·{' '}
                {mapping.status.toLowerCase()}
              </p>
            ))}
            {connection.propertyMappings.length === 0 ? <p>No properties mapped yet.</p> : null}
          </div>
          <form
            className="supplier-form"
            onSubmit={(event) =>
              void submit(
                event,
                '/api/v1/partner/channels/syncs',
                'Synchronization queued for the integration worker.',
              )
            }
          >
            <input name="connectionId" type="hidden" value={connection.id} />
            <label>
              Direction
              <select name="direction" defaultValue="BIDIRECTIONAL">
                <option value="PULL">Pull into Mandyal</option>
                <option value="PUSH">Push to channel</option>
                <option value="BIDIRECTIONAL">Bidirectional</option>
              </select>
            </label>
            <button className="ui-button ui-button--primary" disabled={busy} type="submit">
              {busy ? 'Working…' : 'Queue sync'}
            </button>
          </form>
          <div className="partner-channel-runs">
            <h3>Recent synchronization</h3>
            {connection.syncRuns.map((run) => (
              <p key={run.id}>
                <strong>{run.status.replaceAll('_', ' ')}</strong> · {run.direction.toLowerCase()} ·{' '}
                {new Date(run.createdAt).toLocaleString('en-IN')}
                {run.conflictCount ? ` · ${run.conflictCount} conflicts` : ''}
                {run.reconciliationNote ? ` · ${run.reconciliationNote}` : ''}
              </p>
            ))}
            {connection.syncRuns.length === 0 ? (
              <p>No synchronization has been requested.</p>
            ) : null}
          </div>
        </section>
      ))}
      {connections.length === 0 ? (
        <div className="ui-card">
          <strong>No channel connections yet.</strong>
          <p>Create the first provider shell above.</p>
        </div>
      ) : null}
    </div>
  );
}
