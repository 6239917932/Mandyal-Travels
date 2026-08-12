'use client';

import { type FormEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

type Vehicle = {
  id: string;
  vehicleName: string;
  category: string;
  registrationNumber: string | null;
  transmission: string;
  seats: number;
  bags: number;
  pickupLocation: string;
  dropoffLocation: string;
  pricePerDay: number;
  totalUnits: number;
  status: string;
  inventoryDays: Array<{
    serviceDate: string;
    availableUnits: number;
    pricePerDay: number | null;
    stopSell: boolean;
  }>;
};
const date = (days: number) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

export function PartnerFleetManager({ canCreateVehicles }: { canCreateVehicles: boolean }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function fetchVehicles(): Promise<Vehicle[]> {
    const response = await fetch('/api/v1/partner/vehicles');
    const result = await readJsonResponse<{ data: Vehicle[] } | ApiErrorResponse>(response);
    if (response.ok && result && 'data' in result) return result.data;
    throw new Error(
      result && 'error' in result ? result.error.message : 'Fleet could not be loaded.',
    );
  }
  useEffect(() => {
    let active = true;
    void fetchVehicles()
      .then((data) => {
        if (active) setVehicles(data);
      })
      .catch((loadError: unknown) => {
        if (active)
          setError(loadError instanceof Error ? loadError.message : 'Fleet could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, []);
  async function createVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/v1/partner/vehicles', {
      body: JSON.stringify(Object.fromEntries(form)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = await readJsonResponse<{ data: Vehicle } | ApiErrorResponse>(response);
    if (!response.ok)
      setError(result && 'error' in result ? result.error.message : 'Vehicle could not be added.');
    else {
      event.currentTarget.reset();
      setMessage('Vehicle added to the live supplier fleet.');
      setVehicles(await fetchVehicles());
    }
    setBusy(false);
  }
  async function saveCalendar(event: FormEvent<HTMLFormElement>, vehicleId: string) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/v1/partner/vehicles/${vehicleId}/availability`, {
      body: JSON.stringify({ ...data, stopSell: data.stopSell === 'on' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
    if (!response.ok)
      setError(
        result && 'error' in result ? result.error.message : 'Calendar could not be updated.',
      );
    else {
      setMessage('Availability and pricing calendar saved.');
      setVehicles(await fetchVehicles());
    }
    setBusy(false);
  }
  return (
    <>
      {message ? (
        <p className="business-policy__success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="booking-page__payment-error" role="alert">
          {error}
        </p>
      ) : null}
      {canCreateVehicles ? (
        <Card>
          <p className="hotel-page__eyebrow">Fleet setup</p>
          <h2>Add a vehicle or vehicle group</h2>
          <form className="supplier-form" onSubmit={createVehicle}>
          <div className="supplier-form__grid">
            <Input
              label="Vehicle name"
              name="vehicleName"
              placeholder="Maruti Suzuki Swift or similar"
              required
            />
            <Input label="Registration (optional)" name="registrationNumber" />
            <Input label="Category" name="category" placeholder="Economy" required />
            <label className="ui-field">
              <span className="ui-field__label">Transmission</span>
              <select className="ui-input" name="transmission">
                <option>Manual</option>
                <option>Automatic</option>
              </select>
            </label>
            <Input label="Seats" min={1} name="seats" required type="number" />
            <Input label="Bags" min={0} name="bags" required type="number" />
            <Input label="Pickup location" name="pickupLocation" required />
            <Input label="Drop-off location" name="dropoffLocation" required />
            <Input label="Daily price (INR)" min={1} name="pricePerDay" required type="number" />
            <Input label="Fleet units" min={1} name="totalUnits" required type="number" />
            <Input label="Fuel policy" name="fuelPolicy" placeholder="Full to full" required />
            <Input
              label="Mileage policy"
              name="mileagePolicy"
              placeholder="Unlimited kilometres"
              required
            />
            <Input
              label="Cancellation policy"
              name="cancellationPolicy"
              placeholder="Free cancellation up to 24 hours"
              required
            />
            <Input
              label="Features (comma separated)"
              name="features"
              placeholder="AC, GPS, roadside support"
            />
          </div>
            <Button fullWidth isLoading={busy} type="submit" variant="accent">
              Add to fleet
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="hotel-page__eyebrow">Fleet access</p>
          <h2>Vehicle setup is administrator-controlled</h2>
          <p>
            You can maintain rates, availability, and stop-sales for the active fleet. Ask your
            supplier administrator to add or register another vehicle.
          </p>
        </Card>
      )}
      <section className="partner-fleet__grid">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id}>
            <div className="booking-confirmation__reference">
              <span>
                {vehicle.category} · {vehicle.transmission}
              </span>
              <strong>{vehicle.vehicleName}</strong>
            </div>
            <p>
              {vehicle.pickupLocation} → {vehicle.dropoffLocation}
              <br />
              {vehicle.seats} seats · {vehicle.bags} bags · {vehicle.totalUnits} units
            </p>
            <strong>₹{vehicle.pricePerDay.toLocaleString('en-IN')} / day</strong>
            <form className="supplier-form" onSubmit={(event) => saveCalendar(event, vehicle.id)}>
              <div className="supplier-form__grid">
                <Input
                  defaultValue={date(1)}
                  label="From"
                  min={date(0)}
                  name="startDate"
                  required
                  type="date"
                />
                <Input
                  defaultValue={date(8)}
                  label="To"
                  min={date(1)}
                  name="endDate"
                  required
                  type="date"
                />
                <Input
                  defaultValue={vehicle.totalUnits}
                  label="Available units"
                  min={0}
                  name="availableUnits"
                  required
                  type="number"
                />
                <Input
                  label="Daily rate override"
                  min={1}
                  name="pricePerDay"
                  placeholder={String(vehicle.pricePerDay)}
                  type="number"
                />
                <Input
                  label="Operations note"
                  maxLength={200}
                  name="note"
                  placeholder="Fleet allocation or maintenance"
                  required
                />
                <label className="supplier-form__check">
                  <input name="stopSell" type="checkbox" /> Stop sales for this period
                </label>
              </div>
              <Button fullWidth isLoading={busy} type="submit" variant="primary">
                Save calendar
              </Button>
            </form>
            {vehicle.inventoryDays.length ? (
              <small>{vehicle.inventoryDays.length} upcoming daily controls loaded.</small>
            ) : (
              <small>Base fleet availability is active.</small>
            )}
          </Card>
        ))}
      </section>
    </>
  );
}
