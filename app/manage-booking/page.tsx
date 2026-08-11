'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse, ManagedHotelBooking } from '@/types/commerce';

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function formatPaymentStatus(status: ManagedHotelBooking['paymentStatus']): string {
  const labels: Record<ManagedHotelBooking['paymentStatus'], string> = {
    captured: 'Paid',
    failed: 'Failed',
    pending: 'Pending',
    refunded: 'Refunded',
  };
  return labels[status];
}

export default function ManageBookingPage() {
  const [booking, setBooking] = useState<ManagedHotelBooking>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRequestingAmendment, setIsRequestingAmendment] = useState(false);
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);

  async function findBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBooking(undefined);
    setError(undefined);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const confirmationCode = String(formData.get('confirmationCode') ?? '')
      .trim()
      .toUpperCase();

    try {
      const response = await fetch(
        `/api/v1/hotels/bookings/${encodeURIComponent(confirmationCode)}`,
      );
      const result = await readJsonResponse<{ data: ManagedHotelBooking } | ApiErrorResponse>(
        response,
      );

      if (!response.ok || !result || !('data' in result)) {
        setError(
          response.status === 401
            ? 'This browser does not have secure access to that booking. Please use the browser where the booking was completed.'
            : 'We could not find that booking. Check the reference and try again.',
        );
        return;
      }

      setBooking(result.data);
    } catch {
      setError('We could not connect to the booking service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function cancelBooking() {
    if (!booking) return;

    const refundMessage = booking.refundable
      ? 'The demonstration payment will be marked as refunded.'
      : 'This rate is non-refundable, so the payment will remain captured.';
    if (!window.confirm(`Cancel booking ${booking.confirmationCode}? ${refundMessage}`)) {
      return;
    }

    setError(undefined);
    setIsCancelling(true);
    try {
      const response = await fetch(
        `/api/v1/hotels/bookings/${encodeURIComponent(booking.confirmationCode)}`,
        { method: 'DELETE' },
      );
      const result = await readJsonResponse<{ data: ManagedHotelBooking } | ApiErrorResponse>(
        response,
      );
      if (!response.ok || !result || !('data' in result)) {
        setError('The booking could not be cancelled. Please try again.');
        return;
      }
      setBooking(result.data);
    } catch {
      setError('We could not connect to the booking service. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  }

  async function requestAmendment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!booking) return;

    setError(undefined);
    setIsRequestingAmendment(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/v1/hotels/bookings/${encodeURIComponent(booking.confirmationCode)}/amendments`,
        {
          body: JSON.stringify({
            reason: String(formData.get('reason') ?? ''),
            requestedCheckInDate: String(formData.get('requestedCheckInDate') ?? ''),
            requestedCheckOutDate: String(formData.get('requestedCheckOutDate') ?? ''),
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      );
      const result = await readJsonResponse<{ data: ManagedHotelBooking } | ApiErrorResponse>(
        response,
      );
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result ? result.error.message : 'The request could not be saved.',
        );
        return;
      }
      setBooking(result.data);
      setShowAmendmentForm(false);
    } catch {
      setError('We could not connect to the booking service. Please try again.');
    } finally {
      setIsRequestingAmendment(false);
    }
  }

  return (
    <div className="booking-page manage-booking">
      <div className="booking-page__container">
        <p className="hotel-page__eyebrow">Your trip</p>
        <h1>Manage your booking</h1>
        <p className="booking-page__intro">
          Enter the booking reference from your confirmation. For your security, access is limited
          to the browser used to complete the booking.
        </p>

        <div className="manage-booking__grid">
          <Card>
            <form className="booking-page__guest-form" onSubmit={findBooking}>
              <Input
                autoComplete="off"
                label="Booking reference"
                name="confirmationCode"
                pattern="MT[0-9]{8}"
                placeholder="MT12345678"
                required
              />
              <Button fullWidth isLoading={isLoading} type="submit" variant="accent">
                Find booking
              </Button>
              {error ? (
                <p className="booking-page__payment-error" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          </Card>

          {booking ? (
            <Card className="manage-booking__result" aria-live="polite">
              <div className="booking-confirmation__reference">
                <span>Booking reference</span>
                <strong>{booking.confirmationCode}</strong>
              </div>
              <div className="booking-confirmation__details">
                <div>
                  <span>Hotel</span>
                  <strong>{booking.hotelName}</strong>
                </div>
                <div>
                  <span>Lead guest</span>
                  <strong>
                    {booking.guest.firstName} {booking.guest.lastName}
                  </strong>
                </div>
                {booking.roomName ? (
                  <div>
                    <span>Room</span>
                    <strong>{booking.roomName}</strong>
                  </div>
                ) : null}
                {booking.checkInDate && booking.checkOutDate ? (
                  <div>
                    <span>Stay</span>
                    <strong>
                      {booking.checkInDate} - {booking.checkOutDate}
                    </strong>
                  </div>
                ) : null}
                {booking.ratePlanName ? (
                  <div>
                    <span>Rate plan</span>
                    <strong>{booking.ratePlanName}</strong>
                  </div>
                ) : null}
                {booking.rooms ? (
                  <div>
                    <span>Rooms</span>
                    <strong>{booking.rooms}</strong>
                  </div>
                ) : null}
                <div>
                  <span>Booking status</span>
                  <strong>{booking.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</strong>
                </div>
                <div>
                  <span>Payment status</span>
                  <strong>{formatPaymentStatus(booking.paymentStatus)}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatCurrency(booking.totalAmount, booking.currency)}</strong>
                </div>
              </div>
              <p className="booking-confirmation__note">
                {booking.cancellationPolicy ??
                  'Need to make a change? Contact support and quote this booking reference.'}
              </p>
              {booking.latestAmendment?.status === 'pending' ? (
                <div className="manage-booking__amendment-status" role="status">
                  <strong>Amendment request pending</strong>
                  <span>
                    Requested stay: {booking.latestAmendment.requestedCheckInDate} -{' '}
                    {booking.latestAmendment.requestedCheckOutDate}
                  </span>
                </div>
              ) : null}
              {booking.latestAmendment?.status === 'approved' ? (
                <div
                  className="manage-booking__amendment-status manage-booking__amendment-status--approved"
                  role="status"
                >
                  <strong>Date change approved</strong>
                  <span>{booking.latestAmendment.reviewNote}</span>
                </div>
              ) : null}
              {booking.latestAmendment?.status === 'declined' ? (
                <div
                  className="manage-booking__amendment-status manage-booking__amendment-status--declined"
                  role="status"
                >
                  <strong>Date change declined</strong>
                  <span>{booking.latestAmendment.reviewNote}</span>
                </div>
              ) : null}
              {showAmendmentForm && booking.status === 'confirmed' ? (
                <form className="manage-booking__amendment-form" onSubmit={requestAmendment}>
                  <div className="booking-page__payment-fields">
                    <Input
                      defaultValue={booking.checkInDate}
                      label="Requested check-in"
                      name="requestedCheckInDate"
                      required
                      type="date"
                    />
                    <Input
                      defaultValue={booking.checkOutDate}
                      label="Requested check-out"
                      name="requestedCheckOutDate"
                      required
                      type="date"
                    />
                  </div>
                  <label className="ui-field">
                    <span className="ui-field__label">Reason for change</span>
                    <textarea
                      className="ui-input manage-booking__reason"
                      maxLength={500}
                      minLength={3}
                      name="reason"
                      required
                    />
                  </label>
                  <div className="manage-booking__document-actions">
                    <Button isLoading={isRequestingAmendment} type="submit" variant="accent">
                      Submit request
                    </Button>
                    <Button onClick={() => setShowAmendmentForm(false)} variant="ghost">
                      Keep current stay
                    </Button>
                  </div>
                </form>
              ) : null}
              <div className="manage-booking__document-actions">
                <Link
                  className="ui-button ui-button--primary"
                  href={`/manage-booking/${booking.confirmationCode}/voucher`}
                >
                  View voucher
                </Link>
                <Link
                  className="ui-button ui-button--secondary"
                  href={`/manage-booking/${booking.confirmationCode}/invoice`}
                >
                  View receipt
                </Link>
                {booking.status === 'confirmed' ? (
                  <>
                    {!booking.latestAmendment || booking.latestAmendment.status !== 'pending' ? (
                      <Button onClick={() => setShowAmendmentForm(true)} variant="secondary">
                        Request date change
                      </Button>
                    ) : null}
                    <Button
                      className="manage-booking__cancel-button"
                      isLoading={isCancelling}
                      onClick={cancelBooking}
                      variant="ghost"
                    >
                      Cancel booking
                    </Button>
                  </>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
