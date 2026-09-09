'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type ApiResult = { error?: { message?: string } };
type OutletOption = { id: string; label: string };
type TableOption = { capacity: number; id: string; label: string };
type ReservationOption = {
  id: string;
  label: string;
  status: string;
  version: number;
};
type EntityOption = {
  id: string;
  label: string;
  status: string;
  type: 'MENU_ITEM' | 'OUTLET' | 'TABLE';
  version: number;
};

function CatalogForm({
  action,
  children,
  disabled = false,
  success,
  submitLabel,
}: {
  action: string;
  children: React.ReactNode;
  disabled?: boolean;
  success: string;
  submitLabel: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    formData.set('action', action);
    try {
      const payload = Object.fromEntries(formData);
      if (action === 'CREATE_RESERVATION' && typeof payload.startsAt === 'string') {
        const startsAt = new Date(payload.startsAt);
        if (!Number.isNaN(startsAt.getTime())) payload.startsAt = startsAt.toISOString();
      }
      const response = await fetch('/api/v1/partner/restaurant-catalog', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
        method: 'POST',
      });
      const result = await readJsonResponse<ApiResult>(response);
      if (!response.ok)
        return setMessage(result?.error?.message ?? 'The restaurant record could not be saved.');
      setMessage(success);
      router.refresh();
    } catch {
      setMessage('The restaurant service could not be reached. You can safely retry.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={submit} className="supplier-form__grid">
      {children}
      <button className="ui-button ui-button--primary" disabled={disabled || pending} type="submit">
        {pending ? 'Saving…' : submitLabel}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function RestaurantOutletForm({ properties }: { properties: OutletOption[] }) {
  return (
    <CatalogForm
      action="CREATE_OUTLET"
      disabled={!properties.length}
      success="Outlet registered with immutable opening evidence."
      submitLabel="Register outlet"
    >
      <label className="ui-field">
        <span className="ui-field__label">Property</span>
        <select className="ui-input" name="propertyId" required>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Outlet code</span>
        <input
          className="ui-input"
          maxLength={30}
          name="outletCode"
          placeholder="RESTAURANT"
          required
        />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Outlet name</span>
        <input className="ui-input" maxLength={100} name="name" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Service area</span>
        <input
          className="ui-input"
          maxLength={100}
          name="serviceArea"
          placeholder="Ground floor dining room"
        />
      </label>
    </CatalogForm>
  );
}

export function RestaurantTableForm({ outlets }: { outlets: OutletOption[] }) {
  return (
    <CatalogForm
      action="CREATE_TABLE"
      disabled={!outlets.length}
      success="Table registered with immutable opening evidence."
      submitLabel="Register table"
    >
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Active outlet</span>
        <select className="ui-input" name="outletId" required>
          {outlets.map((outlet) => (
            <option key={outlet.id} value={outlet.id}>
              {outlet.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Table code</span>
        <input className="ui-input" maxLength={30} name="tableCode" placeholder="T01" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Guest capacity</span>
        <input className="ui-input" max={50} min={1} name="capacity" required type="number" />
      </label>
    </CatalogForm>
  );
}

export function RestaurantMenuItemForm({ outlets }: { outlets: OutletOption[] }) {
  return (
    <CatalogForm
      action="CREATE_MENU_ITEM"
      disabled={!outlets.length}
      success="Menu item registered with immutable opening evidence."
      submitLabel="Add menu item"
    >
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Active outlet</span>
        <select className="ui-input" name="outletId" required>
          {outlets.map((outlet) => (
            <option key={outlet.id} value={outlet.id}>
              {outlet.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Category</span>
        <input
          className="ui-input"
          maxLength={60}
          name="category"
          placeholder="Breakfast"
          required
        />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Item name</span>
        <input className="ui-input" maxLength={100} name="name" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Price (INR)</span>
        <input className="ui-input" max={500000} min={1} name="unitPrice" required type="number" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Dietary marker</span>
        <span>
          <input name="vegetarian" type="checkbox" /> Vegetarian
        </span>
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Description</span>
        <input className="ui-input" maxLength={300} name="description" />
      </label>
    </CatalogForm>
  );
}

export function RestaurantStatusForm({ entities }: { entities: EntityOption[] }) {
  const [selectedId, setSelectedId] = useState(entities[0]?.id ?? '');
  const selected = entities.find((entity) => entity.id === selectedId);
  const statuses = selected?.type === 'TABLE' ? ['ACTIVE', 'OUT_OF_SERVICE'] : ['ACTIVE', 'PAUSED'];
  return (
    <CatalogForm
      action="CHANGE_STATUS"
      disabled={!entities.length}
      success="Status changed with immutable evidence."
      submitLabel="Record status change"
    >
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Restaurant record</span>
        <select
          className="ui-input"
          name="entityId"
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
          required
        >
          {entities.map((entity) => (
            <option key={`${entity.type}-${entity.id}`} value={entity.id}>
              {entity.label}
            </option>
          ))}
        </select>
      </label>
      <input name="entityType" type="hidden" value={selected?.type ?? ''} />
      <input name="expectedVersion" type="hidden" value={selected?.version ?? 0} />
      <label className="ui-field">
        <span className="ui-field__label">New status</span>
        <select className="ui-input" key={selectedId} name="status" required>
          {statuses
            .filter((status) => status !== selected?.status)
            .map((status) => (
              <option key={status} value={status}>
                {status.toLowerCase().replaceAll('_', ' ')}
              </option>
            ))}
        </select>
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Reason</span>
        <input className="ui-input" maxLength={300} minLength={8} name="note" required />
      </label>
    </CatalogForm>
  );
}

export function RestaurantReservationForm({ tables }: { tables: TableOption[] }) {
  const [selectedId, setSelectedId] = useState(tables[0]?.id ?? '');
  const selected = tables.find((table) => table.id === selectedId);
  return (
    <CatalogForm
      action="CREATE_RESERVATION"
      disabled={!tables.length}
      success="Table reservation recorded and its time slots protected."
      submitLabel="Reserve table"
    >
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Active table</span>
        <select
          className="ui-input"
          name="tableId"
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
          required
        >
          {tables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.label} · up to {table.capacity} guests
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Guest name</span>
        <input className="ui-input" maxLength={100} minLength={2} name="guestName" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Party size</span>
        <input
          className="ui-input"
          max={selected?.capacity ?? 50}
          min={1}
          name="partySize"
          required
          type="number"
        />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Contact phone</span>
        <input className="ui-input" maxLength={30} name="contactPhone" type="tel" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Contact email</span>
        <input className="ui-input" maxLength={160} name="contactEmail" type="email" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Reservation starts</span>
        <input className="ui-input" name="startsAt" required step={1800} type="datetime-local" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Duration</span>
        <select className="ui-input" defaultValue="90" name="durationMinutes" required>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="90">1 hour 30 minutes</option>
          <option value="120">2 hours</option>
          <option value="150">2 hours 30 minutes</option>
          <option value="180">3 hours</option>
        </select>
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Reservation notes</span>
        <input className="ui-input" maxLength={300} name="notes" />
      </label>
      <p className="supplier-form__full-width">
        Enter either a phone number or email. Conflicting half-hour table slots are rejected.
      </p>
    </CatalogForm>
  );
}

export function RestaurantReservationStatusForm({
  reservations,
}: {
  reservations: ReservationOption[];
}) {
  const [selectedId, setSelectedId] = useState(reservations[0]?.id ?? '');
  const selected = reservations.find((reservation) => reservation.id === selectedId);
  const transitions =
    selected?.status === 'BOOKED'
      ? ['SEATED', 'CANCELLED', 'NO_SHOW']
      : selected?.status === 'SEATED'
        ? ['COMPLETED', 'CANCELLED']
        : [];
  return (
    <CatalogForm
      action="CHANGE_RESERVATION_STATUS"
      disabled={!reservations.length || !transitions.length}
      success="Reservation status changed with immutable evidence."
      submitLabel="Record reservation status"
    >
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Open reservation</span>
        <select
          className="ui-input"
          name="reservationId"
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
          required
        >
          {reservations.map((reservation) => (
            <option key={reservation.id} value={reservation.id}>
              {reservation.label}
            </option>
          ))}
        </select>
      </label>
      <input name="expectedVersion" type="hidden" value={selected?.version ?? 0} />
      <label className="ui-field">
        <span className="ui-field__label">New status</span>
        <select className="ui-input" key={selectedId} name="status" required>
          {transitions.map((status) => (
            <option key={status} value={status}>
              {status.toLowerCase().replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Reason or service note</span>
        <input className="ui-input" maxLength={300} minLength={8} name="note" required />
      </label>
    </CatalogForm>
  );
}
