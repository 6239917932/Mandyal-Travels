'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { HotelPosStatus } from '@/lib/pms/pointOfSale';
import type { ApiErrorResponse } from '@/types/commerce';

type Stay = { confirmationCode: string; guestName: string; roomNumber: string };
type DraftItem = { name: string; quantity: string; unitPrice: string };
type HotelServiceWorkflow = 'GUEST_SERVICES' | 'POS';

function newRetryKey() {
  return crypto.randomUUID();
}

async function errorMessage(response: Response, fallback: string) {
  const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
  return !response.ok || !result || !('data' in result)
    ? result && 'error' in result
      ? result.error.message
      : fallback
    : undefined;
}

function HotelServiceOrderForm({
  propertyId,
  stays,
  workflow,
}: {
  propertyId: string;
  stays: Stay[];
  workflow: HotelServiceWorkflow;
}) {
  const router = useRouter();
  const retryKey = useRef(newRetryKey());
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([{ name: '', quantity: '1', unitPrice: '' }]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(
        workflow === 'POS' ? '/api/v1/partner/pos-orders' : '/api/v1/partner/guest-service-orders',
        {
          body: JSON.stringify({
            confirmationCode: form.get('confirmationCode'),
            items,
            note: form.get('note'),
            outletName: form.get('outletName'),
            propertyId,
            serviceMode: form.get('serviceMode'),
          }),
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': retryKey.current,
          },
          method: 'POST',
        },
      );
      const message = await errorMessage(response, 'The order was not placed.');
      if (message) {
        setError(message);
        return;
      }
      retryKey.current = newRetryKey();
      formElement.reset();
      setItems([{ name: '', quantity: '1', unitPrice: '' }]);
      router.refresh();
    } catch {
      setError('The order service could not be reached. You can safely retry.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      <label className="ui-field">
        <span className="ui-field__label">Checked-in stay</span>
        <select className="ui-input" name="confirmationCode" required>
          {stays.map((stay) => (
            <option key={stay.confirmationCode} value={stay.confirmationCode}>
              {stay.confirmationCode} · {stay.guestName}
              {stay.roomNumber ? ` · room ${stay.roomNumber}` : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Service mode</span>
        <select className="ui-input" name="serviceMode" required>
          {workflow === 'POS' ? (
            <>
              <option value="ROOM_SERVICE">Room service</option>
              <option value="OUTLET">Hotel outlet</option>
            </>
          ) : (
            <>
              <option value="LAUNDRY">Guest laundry</option>
              <option value="MINIBAR">Minibar posting</option>
              <option value="SPA">Spa and wellness service</option>
            </>
          )}
        </select>
      </label>
      <Input
        label={
          workflow === 'POS' ? 'Serving outlet or kitchen' : 'Service desk or inspection point'
        }
        maxLength={80}
        minLength={2}
        name="outletName"
        placeholder={workflow === 'POS' ? 'Main kitchen' : 'Laundry desk'}
        required
      />
      <Input label="Service note (optional)" maxLength={240} name="note" />
      <div className="supplier-form__full-width">
        <p className="ui-field__label">Order items</p>
        {items.map((item, index) => (
          <div className="supplier-form__grid" key={index}>
            <Input
              label={`Item ${index + 1}`}
              maxLength={80}
              minLength={2}
              onChange={(event) =>
                setItems((current) =>
                  current.map((value, itemIndex) =>
                    itemIndex === index ? { ...value, name: event.target.value } : value,
                  ),
                )
              }
              required
              value={item.name}
            />
            <Input
              label="Quantity"
              max={50}
              min={1}
              onChange={(event) =>
                setItems((current) =>
                  current.map((value, itemIndex) =>
                    itemIndex === index ? { ...value, quantity: event.target.value } : value,
                  ),
                )
              }
              required
              type="number"
              value={item.quantity}
            />
            <Input
              label="Unit price (whole currency units)"
              max={500000}
              min={1}
              onChange={(event) =>
                setItems((current) =>
                  current.map((value, itemIndex) =>
                    itemIndex === index ? { ...value, unitPrice: event.target.value } : value,
                  ),
                )
              }
              required
              type="number"
              value={item.unitPrice}
            />
            {items.length > 1 ? (
              <Button
                onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                type="button"
                variant="secondary"
              >
                Remove item
              </Button>
            ) : null}
          </div>
        ))}
        {items.length < 20 ? (
          <Button
            onClick={() =>
              setItems((current) => [...current, { name: '', quantity: '1', unitPrice: '' }])
            }
            type="button"
            variant="secondary"
          >
            Add another item
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="supplier-form__full-width" isLoading={isSaving} type="submit">
        {workflow === 'POS' ? 'Place kitchen order' : 'Record guest-service order'}
      </Button>
    </form>
  );
}

export function HotelPosOrderForm(props: { propertyId: string; stays: Stay[] }) {
  return <HotelServiceOrderForm {...props} workflow="POS" />;
}

export function HotelGuestServiceOrderForm(props: { propertyId: string; stays: Stay[] }) {
  return <HotelServiceOrderForm {...props} workflow="GUEST_SERVICES" />;
}

function HotelServiceTransitionControls({
  nextStatuses,
  orderId,
  version,
  workflow,
}: {
  nextStatuses: readonly HotelPosStatus[];
  orderId: string;
  version: number;
  workflow: HotelServiceWorkflow;
}) {
  const router = useRouter();
  const retryKey = useRef(newRetryKey());
  const [cancellationReason, setCancellationReason] = useState('');
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function transition(targetStatus: HotelPosStatus) {
    setError(undefined);
    setIsSaving(true);
    try {
      const basePath =
        workflow === 'POS' ? '/api/v1/partner/pos-orders' : '/api/v1/partner/guest-service-orders';
      const response = await fetch(`${basePath}/${encodeURIComponent(orderId)}`, {
        body: JSON.stringify({
          note: targetStatus === 'CANCELLED' ? cancellationReason : '',
          targetStatus,
          version,
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': retryKey.current,
        },
        method: 'POST',
      });
      const message = await errorMessage(response, 'The order state was not updated.');
      if (message) {
        setError(message);
        return;
      }
      retryKey.current = newRetryKey();
      router.refresh();
    } catch {
      setError('The order service could not be reached. You can safely retry.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!nextStatuses.length) return null;
  return (
    <div className="supplier-form__grid">
      {nextStatuses.includes('CANCELLED') ? (
        <Input
          label="Cancellation reason"
          maxLength={240}
          minLength={8}
          onChange={(event) => setCancellationReason(event.target.value)}
          value={cancellationReason}
        />
      ) : null}
      {nextStatuses.map((status) => (
        <Button
          disabled={status === 'CANCELLED' && cancellationReason.trim().length < 8}
          isLoading={isSaving}
          key={status}
          onClick={() => transition(status)}
          type="button"
          variant={status === 'CANCELLED' ? 'secondary' : 'primary'}
        >
          {status === 'POSTED'
            ? workflow === 'POS'
              ? 'Serve and post to folio'
              : 'Complete and post to folio'
            : status === 'CANCELLED'
              ? 'Cancel order'
              : `Move to ${status.toLowerCase()}`}
        </Button>
      ))}
      {error ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function HotelPosTransitionControls(
  props: Omit<Parameters<typeof HotelServiceTransitionControls>[0], 'workflow'>,
) {
  return <HotelServiceTransitionControls {...props} workflow="POS" />;
}

export function HotelGuestServiceTransitionControls(
  props: Omit<Parameters<typeof HotelServiceTransitionControls>[0], 'workflow'>,
) {
  return <HotelServiceTransitionControls {...props} workflow="GUEST_SERVICES" />;
}
