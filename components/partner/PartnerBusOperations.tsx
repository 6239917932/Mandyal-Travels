'use client';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';
type Trip = {
  arrivalTime: string;
  busType: string;
  departureTime: string;
  id: string;
  pricePerSeat: number;
  refundable: boolean;
  seatCapacity: number;
  serviceDate: string;
  status: string;
};
type Route = {
  boardingPoint: string;
  destination: string;
  droppingPoint: string;
  id: string;
  origin: string;
  status: string;
  trips: Trip[];
};
export function PartnerBusOperations({
  canCreateRoutes,
  today,
}: {
  canCreateRoutes: boolean;
  today: string;
}) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch('/api/v1/partner/bus-routes');
    const result = await readJsonResponse<{ data: Route[] } | ApiErrorResponse>(response);
    if (!response.ok || !result || !('data' in result))
      throw new Error(
        result && 'error' in result ? result.error.message : 'Routes could not be loaded.',
      );
    setRoutes(result.data);
  }, []);
  useEffect(() => {
    const task = window.setTimeout(
      () =>
        void load().catch((cause: unknown) =>
          setError(cause instanceof Error ? cause.message : 'Routes could not be loaded.'),
        ),
      0,
    );
    return () => window.clearTimeout(task);
  }, [load]);
  async function submit(
    event: FormEvent<HTMLFormElement>,
    url: string,
    success: string,
    transform?: (data: Record<string, FormDataEntryValue>) => object,
  ) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(url, {
      body: JSON.stringify(transform ? transform(values) : values),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
    if (!response.ok)
      setError(
        result && 'error' in result ? result.error.message : 'The operation could not be saved.',
      );
    else {
      event.currentTarget.reset();
      setMessage(success);
      await load();
    }
    setBusy(false);
  }
  async function updateTrip(event: FormEvent<HTMLFormElement>, tripId: string) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/v1/partner/bus-trips/${tripId}`, {
        body: JSON.stringify(values),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
      if (!response.ok)
        setError(
          result && 'error' in result
            ? result.error.message
            : 'Trip controls could not be updated.',
        );
      else {
        setMessage('Trip capacity, fare, and distribution status updated.');
        await load();
      }
    } catch {
      setError('The trip control service could not be reached.');
    } finally {
      setBusy(false);
    }
  }
  async function updateRoute(routeId: string, status: 'ACTIVE' | 'PAUSED') {
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/v1/partner/bus-routes/${routeId}`, {
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
      if (!response.ok)
        setError(
          result && 'error' in result
            ? result.error.message
            : 'Route distribution could not be updated.',
        );
      else {
        setMessage(
          status === 'ACTIVE'
            ? 'Route restored to customer distribution.'
            : 'Route paused across customer distribution.',
        );
        await load();
      }
    } catch {
      setError('The route control service could not be reached.');
    } finally {
      setBusy(false);
    }
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
      {canCreateRoutes ? (
        <Card>
          <h2>Create an operating route</h2>
          <form
            className="supplier-form"
            onSubmit={(event) =>
              submit(
                event,
                '/api/v1/partner/bus-routes',
                'Route created. Add its first dated trip below.',
              )
            }
          >
            <div className="supplier-form__grid">
              <Input label="Origin" name="origin" required />
              <Input label="Destination" name="destination" required />
              <Input label="Boarding point" name="boardingPoint" required />
              <Input label="Dropping point" name="droppingPoint" required />
            </div>
            <Button fullWidth isLoading={busy} type="submit">
              Create route
            </Button>
          </form>
        </Card>
      ) : null}
      <section className="partner-fleet__grid">
        {routes.map((route) => (
          <Card key={route.id}>
            <div className="booking-confirmation__reference">
              <span>{route.status}</span>
              <strong>
                {route.origin} → {route.destination}
              </strong>
            </div>
            <p>
              {route.boardingPoint}
              <br />
              to {route.droppingPoint}
            </p>
            {canCreateRoutes ? (
              <Button
                disabled={busy}
                onClick={() =>
                  updateRoute(route.id, route.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')
                }
                variant="secondary"
              >
                {route.status === 'ACTIVE' ? 'Pause entire route' : 'Restore entire route'}
              </Button>
            ) : null}
            <form
              className="supplier-form"
              onSubmit={(event) =>
                submit(
                  event,
                  `/api/v1/partner/bus-routes/${route.id}/trips`,
                  'Dated bus trip scheduled.',
                  (data) => ({ ...data, refundable: data.refundable === 'on' }),
                )
              }
            >
              <h3>Schedule a dated trip</h3>
              <div className="supplier-form__grid">
                <Input label="Service date" min={today} name="serviceDate" required type="date" />
                <Input label="Departure time" name="departureTime" required type="time" />
                <Input label="Arrival time" name="arrivalTime" required type="time" />
                <Input
                  label="Bus type"
                  name="busType"
                  placeholder="Volvo AC Sleeper (2+1)"
                  required
                />
                <Input
                  label="Seat capacity"
                  max={80}
                  min={1}
                  name="seatCapacity"
                  required
                  type="number"
                />
                <Input
                  label="Price per seat (INR)"
                  max={100000}
                  min={100}
                  name="pricePerSeat"
                  required
                  type="number"
                />
                <Input label="Amenities (comma separated)" name="amenities" />
                <Input
                  label="Cancellation policy"
                  minLength={10}
                  name="cancellationPolicy"
                  required
                />
                <label className="supplier-form__check">
                  <input name="refundable" type="checkbox" /> Refundable under the stated policy
                </label>
              </div>
              <Button fullWidth isLoading={busy} type="submit" variant="accent">
                Schedule trip
              </Button>
            </form>
            {route.trips.length ? (
              <div className="partner-workspace__properties">
                {route.trips.map((trip) => (
                  <form
                    className="partner-fleet__maintenance supplier-form"
                    key={trip.id}
                    onSubmit={(event) => updateTrip(event, trip.id)}
                  >
                    <strong>
                      {trip.serviceDate} · {trip.departureTime}–{trip.arrivalTime}
                    </strong>
                    <span>
                      {trip.busType} · {trip.refundable ? 'Refundable' : 'Restricted'}
                    </span>
                    <div className="supplier-form__grid">
                      <Input
                        defaultValue={trip.seatCapacity}
                        label="Saleable seat capacity"
                        max={80}
                        min={1}
                        name="seatCapacity"
                        required
                        type="number"
                      />
                      <Input
                        defaultValue={trip.pricePerSeat}
                        label="Price per seat (INR)"
                        max={100000}
                        min={100}
                        name="pricePerSeat"
                        required
                        type="number"
                      />
                      <label className="ui-field">
                        <span className="ui-field__label">Distribution status</span>
                        <select className="ui-input" defaultValue={trip.status} name="status">
                          <option value="ACTIVE">Active in customer search</option>
                          <option value="PAUSED">Paused / stop sale</option>
                        </select>
                      </label>
                    </div>
                    <Button
                      disabled={!canCreateRoutes}
                      isLoading={busy}
                      type="submit"
                      variant="secondary"
                    >
                      Update trip controls
                    </Button>
                  </form>
                ))}
              </div>
            ) : (
              <small>No dated trips scheduled.</small>
            )}
          </Card>
        ))}
      </section>
    </>
  );
}
