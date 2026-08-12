'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse, PartnerBookingRecord } from '@/types/commerce';

type PartnerBookingMeta = {
  capturedInrValue: number;
  confirmedCount: number;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default function PartnerBookingsPage() {
  const [bookings, setBookings] = useState<PartnerBookingRecord[]>([]);
  const [meta, setMeta] = useState<PartnerBookingMeta>();
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const filteredBookings = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return bookings;
    return bookings.filter((booking) =>
      [booking.confirmationCode, booking.guestName, booking.guestEmail, booking.hotelName]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [bookings, filter]);

  const loadPage = useCallback(async (page: number) => {
    setError(undefined);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/partner/bookings?page=${page}&pageSize=50`);
      const result = await readJsonResponse<
        { data: PartnerBookingRecord[]; meta: PartnerBookingMeta } | ApiErrorResponse
      >(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          response.status === 401
            ? 'Sign in with an assigned partner account to open this workspace.'
            : 'Bookings could not be loaded.',
        );
        return;
      }
      setBookings(result.data);
      setMeta(result.meta);
      setFilter('');
    } catch {
      setError('The partner service could not be reached.');
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
            <p className="hotel-page__eyebrow">Partner operations</p>
            <h1>Booking dashboard</h1>
            <p className="booking-page__intro">
              Monitor hotel reservations, payment state, stay dates, and room allocation.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner">
              Workspace
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/inventory">
              Inventory
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/amendments">
              Amendments
            </Link>
          </div>
        </div>
        {isLoading && !meta ? <Card>Loading your assigned booking records…</Card> : null}
        {error ? (
          <p className="booking-page__payment-error" role="alert">
            {error}
          </p>
        ) : null}
        {meta ? (
          <>
            <div className="partner-bookings__summary">
              <Card>
                <span>Total bookings</span>
                <strong>{meta.totalCount}</strong>
              </Card>
              <Card>
                <span>Confirmed</span>
                <strong>{meta.confirmedCount}</strong>
              </Card>
              <Card>
                <span>Captured value</span>
                <strong>{money(meta.capturedInrValue, 'INR')}</strong>
              </Card>
            </div>
            <Card className="partner-bookings__search">
              <Input
                label="Search this page"
                name="filter"
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Reference, guest, email, or hotel"
                value={filter}
              />
            </Card>
            <div className="partner-bookings__list" aria-live="polite">
              {filteredBookings.map((booking) => (
                <Card className="partner-bookings__booking" key={booking.confirmationCode}>
                  <div className="booking-confirmation__reference">
                    <span>{booking.hotelName}</span>
                    <strong>{booking.confirmationCode}</strong>
                  </div>
                  <div className="booking-confirmation__details">
                    <div>
                      <span>Guest</span>
                      <strong>{booking.guestName}</strong>
                      <small>{booking.guestEmail}</small>
                    </div>
                    <div>
                      <span>Stay</span>
                      <strong>
                        {booking.checkInDate} - {booking.checkOutDate}
                      </strong>
                    </div>
                    <div>
                      <span>Room</span>
                      <strong>
                        {booking.rooms} × {booking.roomName}
                      </strong>
                      <small>{booking.ratePlanName}</small>
                    </div>
                    <div>
                      <span>Booking</span>
                      <strong className={`partner-status partner-status--${booking.status}`}>
                        {booking.status}
                      </strong>
                    </div>
                    <div>
                      <span>Payment</span>
                      <strong>{booking.paymentStatus}</strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>{money(booking.totalAmount, booking.currency)}</strong>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredBookings.length === 0 ? <p>No bookings match your search.</p> : null}
            </div>
            <Card className="business-report__pagination">
              <p>
                Page {meta.page} of {meta.totalPages} · showing up to {meta.pageSize} bookings
              </p>
              <div className="manage-booking__document-actions">
                <Button
                  disabled={isLoading || meta.page <= 1}
                  onClick={() => loadPage(meta.page - 1)}
                  variant="secondary"
                >
                  Previous page
                </Button>
                <Button
                  disabled={isLoading || meta.page >= meta.totalPages}
                  onClick={() => loadPage(meta.page + 1)}
                  variant="secondary"
                >
                  Next page
                </Button>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
