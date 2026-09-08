'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

function retryKey() {
  return crypto.randomUUID();
}

async function responseError(response: Response, fallback: string) {
  const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
  return !response.ok || !result || !('data' in result)
    ? result && 'error' in result
      ? result.error.message
      : fallback
    : undefined;
}

export function RoomInspectionForm({ physicalRoomId }: { physicalRoomId: string }) {
  const router = useRouter();
  const key = useRef(retryKey());
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const element = event.currentTarget;
    const form = new FormData(element);
    try {
      const response = await fetch(
        `/api/v1/partner/physical-rooms/${encodeURIComponent(physicalRoomId)}/inspections`,
        {
          body: JSON.stringify({ note: form.get('note'), result: form.get('result') }),
          headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': key.current },
          method: 'POST',
        },
      );
      const message = await responseError(response, 'The room inspection was not recorded.');
      if (message) return setError(message);
      key.current = retryKey();
      element.reset();
      router.refresh();
    } catch {
      setError('The inspection service could not be reached. You can safely retry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      <label className="ui-field">
        <span className="ui-field__label">Inspection result</span>
        <select className="ui-input" name="result" required>
          <option value="PASSED">Passed</option>
          <option value="FAILED">Failed</option>
        </select>
      </label>
      <Input label="Inspection note" maxLength={300} name="note" />
      <Button isLoading={saving} type="submit" variant="secondary">
        Record inspection
      </Button>
      {error ? (
        <p className="ui-field__error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export type MaintenanceRoomOption = {
  id: string;
  label: string;
};

export function MaintenanceWorkOrderForm({ rooms }: { rooms: MaintenanceRoomOption[] }) {
  const router = useRouter();
  const key = useRef(retryKey());
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const element = event.currentTarget;
    const form = new FormData(element);
    try {
      const response = await fetch('/api/v1/partner/maintenance-work-orders', {
        body: JSON.stringify({
          category: form.get('category'),
          description: form.get('description'),
          physicalRoomId: form.get('physicalRoomId'),
          priority: form.get('priority'),
          summary: form.get('summary'),
        }),
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': key.current },
        method: 'POST',
      });
      const message = await responseError(response, 'The maintenance work order was not opened.');
      if (message) return setError(message);
      key.current = retryKey();
      element.reset();
      router.refresh();
    } catch {
      setError('The maintenance service could not be reached. You can safely retry.');
    } finally {
      setSaving(false);
    }
  }

  if (!rooms.length) return <p>Add physical rooms before opening a maintenance work order.</p>;
  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      <label className="ui-field">
        <span className="ui-field__label">Property room</span>
        <select className="ui-input" name="physicalRoomId" required>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Category</span>
        <select className="ui-input" name="category" required>
          <option value="PLUMBING">Plumbing</option>
          <option value="ELECTRICAL">Electrical</option>
          <option value="HVAC">HVAC</option>
          <option value="FURNITURE">Furniture</option>
          <option value="SAFETY">Safety</option>
          <option value="OTHER">Other</option>
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Priority</span>
        <select className="ui-input" defaultValue="NORMAL" name="priority" required>
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </label>
      <Input label="Issue summary" maxLength={120} minLength={5} name="summary" required />
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Description</span>
        <textarea className="ui-input" maxLength={600} name="description" rows={4} />
      </label>
      <Button className="supplier-form__full-width" isLoading={saving} type="submit">
        Open work order and take room out of service
      </Button>
      {error ? (
        <p className="ui-field__error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function MaintenanceStatusForm({
  status,
  version,
  workOrderId,
}: {
  status: string;
  version: number;
  workOrderId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  if (status === 'RESOLVED' || status === 'CANCELLED') return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/v1/partner/maintenance-work-orders/${encodeURIComponent(workOrderId)}`,
        {
          body: JSON.stringify({ note: form.get('note'), status: form.get('status'), version }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      );
      const message = await responseError(response, 'The maintenance status was not updated.');
      if (message) return setError(message);
      router.refresh();
    } catch {
      setError('The maintenance service could not be reached.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      <label className="ui-field">
        <span className="ui-field__label">Next status</span>
        <select className="ui-input" name="status" required>
          {status === 'OPEN' ? <option value="IN_PROGRESS">In progress</option> : null}
          <option value="RESOLVED">Resolved</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </label>
      <Input label="Update note" maxLength={400} name="note" />
      <Button isLoading={saving} type="submit" variant="secondary">
        Save status
      </Button>
      {error ? (
        <p className="ui-field__error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
