'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

type VehicleReservation = {
  confirmationCode: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  dropoffDate: string;
  pickupDate: string;
  status: string;
  totalAmount: number;
  vehicle: {
    dropoffLocation: string;
    pickupLocation: string;
    registrationNumber: string | null;
    vehicleName: string;
  };
};

type ReservationMeta = {
  capturedInrValue: number;
  confirmedCount: number;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);

export default function PartnerReservationsPage() {
  const [reservations, setReservations] = useState<VehicleReservation[]>([]);
  const [meta, setMeta] = useState<ReservationMeta>();
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return reservations;
    return reservations.filter((reservation) =>
      [
        reservation.confirmationCode,
        reservation.customerEmail,
        reservation.customerName,
        reservation.vehicle.registrationNumber,
        reservation.vehicle.vehicleName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [filter, reservations]);

  const loadPage = useCallback(async (page: number) => {
    setError(undefined);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/partner/reservations?page=${page}&pageSize=50`);
      const result = await readJsonResponse<
        { data: VehicleReservation[]; meta: ReservationMeta } | ApiErrorResponse
      >(response);
      if (!response.ok || !result || !('data' in result)) {
        setError('Vehicle reservations could not be loaded for this supplier account.');
        return;
      }
      setReservations(result.data);
      setMeta(result.meta);
      setFilter('');
    } catch {
      setError('The reservation service could not be reached.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void loadPage(1), 0);
    return () => window.clearTimeout(task);
  }, [loadPage]);

  return (
    <div className="booking-page partner-bookings">
      <div className="booking-page__container">
        <div className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Fleet operations</p>
            <h1>Vehicle reservations</h1>
            <p className="booking-page__intro">
              Monitor confirmed rentals, customers, routes, travel dates, and captured value.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner">
              Workspace
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/fleet">
              Fleet and calendar
            </Link>
          </div>
        </div>
        {error ? <p className="booking-page__payment-error">{error}</p> : null}
        {isLoading && !meta ? <Card>Loading vehicle reservations…</Card> : null}
        {meta ? (
          <>
            <div className="partner-bookings__summary">
              <Card><span>Total reservations</span><strong>{meta.totalCount}</strong></Card>
              <Card><span>Confirmed</span><strong>{meta.confirmedCount}</strong></Card>
              <Card><span>Captured value</span><strong>{money(meta.capturedInrValue)}</strong></Card>
            </div>
            <Card className="partner-bookings__search">
              <Input
                label="Search this page"
                name="filter"
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Reference, customer, email, vehicle, or registration"
                value={filter}
              />
            </Card>
            <div className="partner-bookings__list" aria-live="polite">
              {filtered.map((reservation) => (
                <Card className="partner-bookings__booking" key={reservation.confirmationCode}>
                  <div className="booking-confirmation__reference">
                    <span>{reservation.vehicle.vehicleName}</span>
                    <strong>{reservation.confirmationCode}</strong>
                  </div>
                  <div className="booking-confirmation__details">
                    <div><span>Driver</span><strong>{reservation.customerName}</strong><small>{reservation.customerEmail}</small></div>
                    <div><span>Route</span><strong>{reservation.vehicle.pickupLocation} → {reservation.vehicle.dropoffLocation}</strong></div>
                    <div><span>Rental</span><strong>{reservation.pickupDate} – {reservation.dropoffDate}</strong></div>
                    <div><span>Registration</span><strong>{reservation.vehicle.registrationNumber ?? 'Supplier assigned'}</strong></div>
                    <div><span>Status</span><strong>{reservation.status}</strong></div>
                    <div><span>Total</span><strong>{money(reservation.totalAmount)}</strong></div>
                  </div>
                </Card>
              ))}
              {filtered.length === 0 ? <Card>No vehicle reservations match this view.</Card> : null}
            </div>
            <Card className="business-report__pagination">
              <p>Page {meta.page} of {meta.totalPages} · showing up to {meta.pageSize} reservations</p>
              <div className="manage-booking__document-actions">
                <Button disabled={isLoading || meta.page <= 1} onClick={() => loadPage(meta.page - 1)} variant="secondary">Previous page</Button>
                <Button disabled={isLoading || meta.page >= meta.totalPages} onClick={() => loadPage(meta.page + 1)} variant="secondary">Next page</Button>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
