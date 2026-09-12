'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore, type FormEvent } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import { buildManualDistributionCsv, type ManualSalesChannel } from '@/lib/pms/manualDistribution';
import type {
  ApiErrorResponse,
  PartnerHotelCalendarRecord,
  PartnerInventoryRatePlanRecord,
  PartnerInventoryRecord,
} from '@/types/commerce';
import { formatLocalCalendarDate, offsetLocalCalendarDate } from '@/utils/localDate';

type PropertyOption = { displayName: string; id: string };
type Mapping = {
  externalPropertyRef: string;
  id: string;
  property: { displayName: string };
};
type Connection = {
  externalAccountRef: string;
  id: string;
  propertyMappings: Mapping[];
  providerName: string;
};

export function ChannelSyncManager({
  canAdminister,
  connections,
  properties,
}: {
  canAdminister: boolean;
  connections: Connection[];
  properties: PropertyOption[];
}) {
  const router = useRouter();
  const today = useSyncExternalStore(
    () => () => undefined,
    () => formatLocalCalendarDate(new Date()),
    () => '',
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calendar, setCalendar] = useState<PartnerHotelCalendarRecord[]>([]);
  const [inventory, setInventory] = useState<PartnerInventoryRecord[]>([]);
  const [ratePlans, setRatePlans] = useState<PartnerInventoryRatePlanRecord[]>([]);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const resolvedStartDate = startDate || today;
  const resolvedEndDate = endDate || offsetLocalCalendarDate(today, 6);
  const manualChannels: ManualSalesChannel[] = connections.map((connection) => ({
    accountReference: connection.externalAccountRef,
    name: connection.providerName,
    properties: connection.propertyMappings.map((mapping) => mapping.property.displayName),
  }));

  async function submitDirectory(
    event: FormEvent<HTMLFormElement>,
    endpoint: string,
    success: string,
  ) {
    event.preventDefault();
    if (busy) return;
    setError(undefined);
    setMessage(undefined);
    const form = event.currentTarget;
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result ? result.error.message : 'The record could not be saved.',
        );
        return;
      }
      form.reset();
      setMessage(success);
      router.refresh();
    } catch {
      setError('The Mandyal PMS service could not be reached.');
    } finally {
      setBusy(false);
    }
  }

  async function loadCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const query = new URLSearchParams({
        checkInDate: resolvedStartDate,
        checkOutDate: resolvedEndDate,
      });
      const response = await fetch(`/api/v1/partner/inventory?${query}`);
      const result = await readJsonResponse<
        | {
            calendar: PartnerHotelCalendarRecord[];
            data: PartnerInventoryRecord[];
            ratePlans: PartnerInventoryRatePlanRecord[];
          }
        | ApiErrorResponse
      >(response);
      if (!response.ok || !result || !('calendar' in result)) {
        setError(
          result && 'error' in result ? result.error.message : 'The calendar could not be loaded.',
        );
        return;
      }
      setCalendar(result.calendar);
      setInventory(result.data);
      setRatePlans(result.ratePlans);
      setSelectedRoomTypeId((current) => current || result.data[0]?.roomTypeId || '');
    } catch {
      setError('The Mandyal PMS service could not be reached.');
    } finally {
      setBusy(false);
    }
  }

  async function saveMasterControl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch('/api/v1/partner/inventory', {
        body: JSON.stringify({
          availableRooms: Number(values.get('availableRooms')),
          checkInDate: resolvedStartDate,
          checkOutDate: resolvedEndDate,
          closedToArrival: values.get('closedToArrival') === 'on',
          closedToDeparture: values.get('closedToDeparture') === 'on',
          maximumStayNights: values.get('maximumStayNights')
            ? Number(values.get('maximumStayNights'))
            : undefined,
          minimumStayNights: values.get('minimumStayNights')
            ? Number(values.get('minimumStayNights'))
            : undefined,
          nightlyRate: values.get('nightlyRate') ? Number(values.get('nightlyRate')) : undefined,
          note: String(values.get('note') ?? ''),
          ratePlanRecordId: String(values.get('ratePlanRecordId') ?? '') || undefined,
          roomTypeId: String(values.get('roomTypeId') ?? ''),
          stopSell: values.get('stopSell') === 'on',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result ? result.error.message : 'The master control was not saved.',
        );
        return;
      }
      const portalCount = manualChannels.length ? String(manualChannels.length) : 'each';
      setMessage(
        `Master PMS controls saved. Export the action sheet and update ${portalCount} external portal${manualChannels.length === 1 ? '' : 's'} manually.`,
      );
      form.reset();
      setSelectedRoomTypeId('');
      setCalendar([]);
    } catch {
      setError('The Mandyal PMS service could not be reached.');
    } finally {
      setBusy(false);
    }
  }

  function exportActionSheet() {
    if (calendar.length === 0) {
      setError('Load the PMS calendar before exporting an action sheet.');
      return;
    }
    const blob = new Blob([buildManualDistributionCsv(calendar, manualChannels)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mandyal-channel-actions-${resolvedStartDate}-to-${resolvedEndDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(
      'Manual channel action sheet exported. Mark each portal complete after updating it.',
    );
  }

  return (
    <div className="partner-channel-manager">
      <div className="partner-channel-mode" role="note">
        <div>
          <span className="admin-status-badge">PMS-ONLY · MANUAL MODE</span>
          <h2>One master calendar, one controlled update process</h2>
          <p>
            Set rates, rooms and restrictions once in Mandyal PMS. The action sheet then lists every
            recorded sales channel that must be updated manually.
          </p>
        </div>
        <p>
          <strong>No automatic OTA transmission.</strong> Mandyal does not store portal passwords,
          sign in to third-party extranets, or claim that an external portal is synchronized.
        </p>
      </div>

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

      <section className="ui-card partner-channel-calendar">
        <div className="partner-channel-section-heading">
          <div>
            <p className="hotel-page__eyebrow">Master controls</p>
            <h2>Rates, availability and restrictions</h2>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/inventory">
            Open full inventory calendar
          </Link>
        </div>
        <form className="supplier-form__grid" onSubmit={loadCalendar}>
          <label>
            From
            <input
              min={today}
              onChange={(event) => setStartDate(event.target.value)}
              required
              type="date"
              value={resolvedStartDate}
            />
          </label>
          <label>
            To
            <input
              min={resolvedStartDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
              type="date"
              value={resolvedEndDate}
            />
          </label>
          <button className="ui-button ui-button--secondary" disabled={busy} type="submit">
            {busy ? 'Loading…' : 'Load master calendar'}
          </button>
          <button
            className="ui-button ui-button--primary"
            onClick={exportActionSheet}
            type="button"
          >
            Export channel action sheet
          </button>
        </form>

        {inventory.length > 0 ? (
          <form className="partner-channel-master-form" onSubmit={saveMasterControl}>
            <h3>Apply one PMS control across the selected dates</h3>
            <div className="supplier-form__grid">
              <label>
                Room type
                <select
                  name="roomTypeId"
                  onChange={(event) => setSelectedRoomTypeId(event.target.value)}
                  required
                  value={selectedRoomTypeId}
                >
                  <option value="">Select room</option>
                  {inventory.map((room) => (
                    <option key={room.roomTypeId} value={room.roomTypeId}>
                      {room.hotelName} · {room.roomName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Rate plan
                <select defaultValue="" name="ratePlanRecordId">
                  <option value="">Availability only / no rate change</option>
                  {ratePlans
                    .filter((plan) => plan.roomTypeId === selectedRoomTypeId)
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Sellable rooms
                <input min={0} name="availableRooms" required type="number" />
              </label>
              <label>
                Master nightly rate (INR)
                <input min={100} name="nightlyRate" placeholder="No rate change" type="number" />
              </label>
              <label>
                Minimum stay
                <input
                  max={30}
                  min={1}
                  name="minimumStayNights"
                  placeholder="No restriction"
                  type="number"
                />
              </label>
              <label>
                Maximum stay
                <input
                  max={90}
                  min={1}
                  name="maximumStayNights"
                  placeholder="No restriction"
                  type="number"
                />
              </label>
            </div>
            <label>
              Audit note
              <input
                maxLength={200}
                minLength={3}
                name="note"
                placeholder="Seasonal rate, allotment change, maintenance…"
                required
              />
            </label>
            <div className="partner-channel-flags">
              <label>
                <input name="stopSell" type="checkbox" /> Stop sell
              </label>
              <label>
                <input name="closedToArrival" type="checkbox" /> Close arrivals
              </label>
              <label>
                <input name="closedToDeparture" type="checkbox" /> Close departures
              </label>
            </div>
            <button className="ui-button ui-button--primary" disabled={busy} type="submit">
              Save master PMS controls
            </button>
          </form>
        ) : (
          <p>Load a date range to view inventory and apply a master control.</p>
        )}

        {calendar.length > 0 ? (
          <div className="partner-channel-table-wrap">
            <table className="partner-channel-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Property / room</th>
                  <th>Rate plan</th>
                  <th>Rate</th>
                  <th>Rooms</th>
                  <th>Restrictions</th>
                </tr>
              </thead>
              <tbody>
                {calendar.map((day) => (
                  <tr key={`${day.roomTypeId}-${day.ratePlanName ?? 'room'}-${day.stayDate}`}>
                    <td>{day.stayDate}</td>
                    <td>
                      {day.hotelName}
                      <small>{day.roomName}</small>
                    </td>
                    <td>{day.ratePlanName ?? 'Room control'}</td>
                    <td>
                      {day.nightlyRate
                        ? `₹${day.nightlyRate.toLocaleString('en-IN')}`
                        : 'Base rate'}
                    </td>
                    <td>{day.availableRooms}</td>
                    <td>
                      {[
                        day.stopSell && 'Stop sell',
                        day.closedToArrival && 'CTA',
                        day.closedToDeparture && 'CTD',
                        day.minimumStayNights && `Min ${day.minimumStayNights}`,
                        day.maximumStayNights && `Max ${day.maximumStayNights}`,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Open'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="partner-channel-directory">
        <div className="partner-channel-section-heading">
          <div>
            <p className="hotel-page__eyebrow">Sales channel directory</p>
            <h2>External portals to update</h2>
          </div>
          <strong>{connections.length} recorded</strong>
        </div>
        {canAdminister ? (
          <form
            className="supplier-form"
            onSubmit={(event) =>
              void submitDirectory(
                event,
                '/api/v1/partner/channels',
                'Sales channel added to the manual update directory.',
              )
            }
          >
            <div className="supplier-form__grid">
              <label>
                Sales channel
                <input
                  maxLength={80}
                  minLength={2}
                  name="providerName"
                  placeholder="MakeMyTrip, Booking.com, Paytm"
                  required
                />
              </label>
              <label>
                Hotel account or property reference
                <input
                  maxLength={100}
                  minLength={2}
                  name="externalAccountRef"
                  placeholder="Your non-secret portal reference"
                  required
                />
              </label>
            </div>
            <p>
              Record only a non-secret reference. Never enter a username, password, API key or OTP.
            </p>
            <button className="ui-button ui-button--secondary" disabled={busy} type="submit">
              Add manual sales channel
            </button>
          </form>
        ) : null}
        <div className="partner-channel-directory-grid">
          {connections.map((connection) => (
            <article className="ui-card partner-channel-card" key={connection.id}>
              <span className="admin-status-badge">MANUAL UPDATE</span>
              <h3>{connection.providerName}</h3>
              <p>Reference: {connection.externalAccountRef}</p>
              <div className="partner-channel-mappings">
                <strong>Mapped properties</strong>
                {connection.propertyMappings.map((mapping) => (
                  <p key={mapping.id}>
                    {mapping.property.displayName} → {mapping.externalPropertyRef}
                  </p>
                ))}
                {connection.propertyMappings.length === 0 ? (
                  <p>Map a property before using this channel in an action sheet.</p>
                ) : null}
              </div>
              {canAdminister ? (
                <form
                  className="supplier-form"
                  onSubmit={(event) =>
                    void submitDirectory(
                      event,
                      '/api/v1/partner/channels/mappings',
                      'Property added to the manual channel checklist.',
                    )
                  }
                >
                  <input name="connectionId" type="hidden" value={connection.id} />
                  <label>
                    Property
                    <select defaultValue="" name="propertyId" required>
                      <option disabled value="">
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
                    Portal property reference
                    <input maxLength={100} minLength={2} name="externalPropertyRef" required />
                  </label>
                  <button className="ui-button ui-button--secondary" disabled={busy} type="submit">
                    Save manual mapping
                  </button>
                </form>
              ) : null}
            </article>
          ))}
          {connections.length === 0 ? (
            <div className="ui-card">
              <strong>No external sales channels recorded.</strong>
              <p>Add only the portals where this hotel already has its own account.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
