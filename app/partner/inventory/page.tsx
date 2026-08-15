'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse, PartnerInventoryRecord } from '@/types/commerce';

function futureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function PartnerInventoryPage() {
  const [checkInDate, setCheckInDate] = useState(futureDate(1));
  const [checkOutDate, setCheckOutDate] = useState(futureDate(4));
  const [inventory, setInventory] = useState<PartnerInventoryRecord[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function loadInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsLoading(true);
    setHasLoaded(false);
    try {
      const params = new URLSearchParams({ checkInDate, checkOutDate });
      const response = await fetch(`/api/v1/partner/inventory?${params}`);
      const result = await readJsonResponse<{ data: PartnerInventoryRecord[] } | ApiErrorResponse>(
        response,
      );
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result ? result.error.message : 'Inventory could not be loaded.',
        );
        return;
      }
      setInventory(result.data);
      setHasLoaded(true);
    } catch {
      setError('The partner service could not be reached.');
    } finally {
      setIsLoading(false);
    }
  }

  async function saveOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(undefined);
    setIsSaving(true);
    try {
      const response = await fetch('/api/v1/partner/inventory', {
        body: JSON.stringify({
          availableRooms: Number(formData.get('availableRooms')),
          checkInDate,
          checkOutDate,
          note: String(formData.get('note') ?? ''),
          nightlyRate: formData.get('nightlyRate')
            ? Number(formData.get('nightlyRate'))
            : undefined,
          minimumStayNights: formData.get('minimumStayNights')
            ? Number(formData.get('minimumStayNights'))
            : undefined,
          maximumStayNights: formData.get('maximumStayNights')
            ? Number(formData.get('maximumStayNights'))
            : undefined,
          closedToArrival: formData.get('closedToArrival') === 'on',
          closedToDeparture: formData.get('closedToDeparture') === 'on',
          roomTypeId: String(formData.get('roomTypeId') ?? ''),
          stopSell: formData.get('stopSell') === 'on',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<{ data: PartnerInventoryRecord[] } | ApiErrorResponse>(
        response,
      );
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result
            ? result.error.message
            : 'The inventory limit could not be saved.',
        );
        return;
      }
      setInventory(result.data);
      form.reset();
    } catch {
      setError('The partner service could not be reached.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="booking-page partner-inventory">
      <div className="booking-page__container">
        <div className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Partner operations</p>
            <h1>Inventory dashboard</h1>
            <p className="booking-page__intro">
              View confirmed allocations, temporary holds, and sellable rooms for any stay period.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner">
              Workspace
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/bookings">
              Bookings
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/properties">
              Properties
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/amendments">
              Amendments
            </Link>
          </div>
        </div>
        <Card>
          <form className="booking-page__guest-form" onSubmit={loadInventory}>
            <div className="booking-page__payment-fields">
              <Input
                label="Check-in"
                min={futureDate(0)}
                name="checkInDate"
                onChange={(event) => setCheckInDate(event.target.value)}
                required
                type="date"
                value={checkInDate}
              />
              <Input
                label="Check-out"
                min={checkInDate}
                name="checkOutDate"
                onChange={(event) => setCheckOutDate(event.target.value)}
                required
                type="date"
                value={checkOutDate}
              />
            </div>
            <Button fullWidth isLoading={isLoading} type="submit" variant="accent">
              Check inventory
            </Button>
            {error ? (
              <p className="booking-page__payment-error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </Card>
        {inventory.length > 0 ? (
          <Card className="partner-inventory__override-card">
            <h2>Room, rate, and stop-sell calendar</h2>
            <p>
              Control seasonal rates, room limits, stay rules, arrivals, departures, and stop-sell
              for the selected date range.
            </p>
            <form className="booking-page__guest-form" onSubmit={saveOverride}>
              <label className="ui-field">
                <span className="ui-field__label">Room type</span>
                <select className="ui-input" name="roomTypeId" required>
                  <option value="">Select a room</option>
                  {inventory.map((room) => (
                    <option key={room.roomTypeId} value={room.roomTypeId}>
                      {room.hotelName} - {room.roomName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="booking-page__payment-fields">
                <Input
                  label="Available room limit"
                  min={0}
                  name="availableRooms"
                  required
                  type="number"
                />
                <Input
                  label="Nightly rate (INR, optional)"
                  min={100}
                  name="nightlyRate"
                  placeholder="Keep existing rate"
                  type="number"
                />
                <Input
                  label="Reason"
                  maxLength={200}
                  minLength={3}
                  name="note"
                  placeholder="Maintenance, allotment, or stop-sell"
                  required
                />
                <Input
                  label="Minimum stay (optional)"
                  max={30}
                  min={1}
                  name="minimumStayNights"
                  placeholder="No restriction"
                  type="number"
                />
                <Input
                  label="Maximum stay (optional)"
                  max={90}
                  min={1}
                  name="maximumStayNights"
                  placeholder="No restriction"
                  type="number"
                />
              </div>
              <label className="supplier-form__check">
                <input name="closedToArrival" type="checkbox" /> Do not allow check-in on these
                dates
              </label>
              <label className="supplier-form__check">
                <input name="closedToDeparture" type="checkbox" /> Do not allow check-out on these
                dates
              </label>
              <label className="supplier-form__check">
                <input name="stopSell" type="checkbox" /> Stop selling this room for the selected
                dates
              </label>
              <Button fullWidth isLoading={isSaving} type="submit" variant="primary">
                Save PMS calendar
              </Button>
            </form>
          </Card>
        ) : null}
        <div className="partner-inventory__list" aria-live="polite">
          {inventory.map((room) => {
            const used = room.activeHolds + room.allocatedRooms;
            const utilization =
              room.effectiveInventory === 0
                ? used > 0
                  ? 100
                  : 0
                : Math.round((used / room.effectiveInventory) * 100);
            return (
              <Card className="partner-inventory__room" key={room.roomTypeId}>
                <div className="booking-confirmation__reference">
                  <span>{room.hotelName}</span>
                  <strong>{room.roomName}</strong>
                </div>
                <div className="partner-inventory__metrics">
                  <div>
                    <span>{room.overrideApplied ? 'Effective limit' : 'Base stock'}</span>
                    <strong>{room.effectiveInventory}</strong>
                  </div>
                  <div>
                    <span>Confirmed</span>
                    <strong>{room.allocatedRooms}</strong>
                  </div>
                  <div>
                    <span>Active holds</span>
                    <strong>{room.activeHolds}</strong>
                  </div>
                  <div>
                    <span>Available</span>
                    <strong
                      className={
                        room.remainingRooms === 0
                          ? 'partner-inventory__sold-out'
                          : 'partner-inventory__available'
                      }
                    >
                      {room.remainingRooms}
                    </strong>
                  </div>
                </div>
                <div className="partner-inventory__utilization">
                  <span style={{ width: `${Math.min(100, utilization)}%` }} />
                </div>
                <small>
                  {utilization}% allocated or held · {room.inventorySource} inventory
                  {room.overrideApplied ? ` · override applied (base ${room.baseInventory})` : ''}
                </small>
              </Card>
            );
          })}
          {hasLoaded && inventory.length === 0 ? (
            <Card>
              <strong>No room inventory is configured.</strong>
              <p>Create a property and its first room type before using the PMS calendar.</p>
              <Link className="home-card__link" href="/partner/properties">
                Open property setup
              </Link>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
