'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

type Reservation = {
  confirmationCode: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  passengerCount: number;
  seatNumbersJson: string;
  status: string;
  totalAmount: number;
  trip: {
    busType: string;
    departureTime: string;
    serviceDate: string;
    route: { destination: string; origin: string };
  };
};
type Meta = {
  capturedInrValue: number;
  confirmedCount: number;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', maximumFractionDigits: 0, style: 'currency' }).format(amount);
const seats = (value: string) => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((seat): seat is string => typeof seat === 'string').join(', ') : '';
  } catch {
    return '';
  }
};

export default function PartnerBusBookingsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [meta, setMeta] = useState<Meta>();
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/v1/partner/bus-reservations?page=${page}&pageSize=50`);
      const result = await readJsonResponse<{ data: Reservation[]; meta: Meta } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) throw new Error('Bus reservations could not be loaded.');
      setReservations(result.data);
      setMeta(result.meta);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The reservation service could not be reached.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { const task = window.setTimeout(() => void load(1), 0); return () => window.clearTimeout(task); }, [load]);
  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query
      ? reservations.filter((reservation) =>
          [reservation.confirmationCode, reservation.customerName, reservation.customerEmail, reservation.trip.route.origin, reservation.trip.route.destination]
            .join(' ').toLowerCase().includes(query),
        )
      : reservations;
  }, [filter, reservations]);
  return <section className="account-page partner-bookings"><div className="partner-page__heading"><div><p className="hotel-page__eyebrow">Bus operator reservations</p><h1>Passenger and seat manifest</h1><p>Review confirmed direct-channel passengers, seats, routes, services, and captured value.</p></div><div className="manage-booking__document-actions"><Link className="ui-button ui-button--secondary" href="/partner/bus-operations">Route operations</Link></div></div>
    {error ? <p className="booking-page__payment-error" role="alert">{error}</p> : null}
    {meta ? <><div className="partner-bookings__summary"><Card><span>Total reservations</span><strong>{meta.totalCount}</strong></Card><Card><span>Confirmed</span><strong>{meta.confirmedCount}</strong></Card><Card><span>Captured value</span><strong>{money(meta.capturedInrValue)}</strong></Card></div><Card className="partner-bookings__search"><Input label="Search this page" name="filter" onChange={(event) => setFilter(event.target.value)} placeholder="Reference, passenger, email, origin, or destination" value={filter} /></Card><div className="partner-bookings__list" aria-live="polite">{filtered.map((reservation) => <Card className="partner-bookings__booking" key={reservation.confirmationCode}><div className="booking-confirmation__reference"><span>{reservation.status}</span><strong>{reservation.confirmationCode}</strong></div><div className="booking-confirmation__details"><div><span>Lead passenger</span><strong>{reservation.customerName}</strong><small>{reservation.customerEmail}</small></div><div><span>Route</span><strong>{reservation.trip.route.origin} → {reservation.trip.route.destination}</strong></div><div><span>Service</span><strong>{reservation.trip.serviceDate} · {reservation.trip.departureTime}</strong><small>{reservation.trip.busType}</small></div><div><span>Passengers</span><strong>{reservation.passengerCount}</strong></div><div><span>Seats</span><strong>{seats(reservation.seatNumbersJson) || 'Not assigned'}</strong></div><div><span>Total</span><strong>{money(reservation.totalAmount)}</strong></div></div></Card>)}{!filtered.length ? <Card>No bus reservations match this view.</Card> : null}</div><Card className="business-report__pagination"><p>Page {meta.page} of {meta.totalPages}</p><div className="manage-booking__document-actions"><Button disabled={loading || meta.page <= 1} onClick={() => load(meta.page - 1)} variant="secondary">Previous page</Button><Button disabled={loading || meta.page >= meta.totalPages} onClick={() => load(meta.page + 1)} variant="secondary">Next page</Button></div></Card></> : loading ? <Card>Loading bus reservations…</Card> : null}
  </section>;
}
