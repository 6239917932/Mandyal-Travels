'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse, PartnerAmendmentRecord } from '@/types/commerce';

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default function PartnerAmendmentsPage() {
  const [partnerKey, setPartnerKey] = useState('');
  const [amendments, setAmendments] = useState<PartnerAmendmentRecord[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string>();

  async function loadAmendments(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(undefined);
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/partner/amendments', {
        headers: { 'x-partner-key': partnerKey },
      });
      const result = await readJsonResponse<{ data: PartnerAmendmentRecord[] } | ApiErrorResponse>(
        response,
      );
      if (!response.ok || !result || !('data' in result)) {
        setError(
          response.status === 401
            ? 'The partner access key is incorrect.'
            : 'Requests could not be loaded.',
        );
        return;
      }
      setAmendments(result.data);
    } catch {
      setError('The partner service could not be reached.');
    } finally {
      setIsLoading(false);
    }
  }

  async function review(amendmentId: string, decision: 'approved' | 'declined') {
    const note = window.prompt(
      decision === 'approved' ? 'Approval note for the guest:' : 'Reason for declining:',
    );
    if (!note || note.trim().length < 3) return;
    if (
      decision === 'approved' &&
      !window.confirm(
        'Approve this change? Availability will be rechecked and the stay will be repriced.',
      )
    )
      return;
    setError(undefined);
    setReviewingId(amendmentId);
    try {
      const response = await fetch(
        `/api/v1/partner/amendments/${encodeURIComponent(amendmentId)}`,
        {
          body: JSON.stringify({ decision, reviewNote: note.trim() }),
          headers: { 'Content-Type': 'application/json', 'x-partner-key': partnerKey },
          method: 'PATCH',
        },
      );
      const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result ? result.error.message : 'The review could not be saved.',
        );
        return;
      }
      setAmendments((current) => current.filter((item) => item.id !== amendmentId));
    } catch {
      setError('The partner service could not be reached.');
    } finally {
      setReviewingId(undefined);
    }
  }

  return (
    <div className="booking-page partner-amendments">
      <div className="booking-page__container">
        <div className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Partner operations</p>
            <h1>Amendment requests</h1>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/bookings">
              Bookings
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/inventory">
              Inventory
            </Link>
          </div>
        </div>
        <p className="booking-page__intro">
          Review guest date-change requests. Approval rechecks inventory and recalculates the total
          using the booked rate plan.
        </p>
        <Card>
          <form className="booking-page__guest-form" onSubmit={loadAmendments}>
            <Input
              label="Partner access key"
              name="partnerKey"
              onChange={(event) => setPartnerKey(event.target.value)}
              required
              type="password"
              value={partnerKey}
            />
            <Button fullWidth isLoading={isLoading} type="submit" variant="accent">
              Open review queue
            </Button>
            {error ? (
              <p className="booking-page__payment-error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </Card>
        <div className="partner-amendments__list" aria-live="polite">
          {!isLoading && partnerKey && amendments.length === 0 && !error ? (
            <p>No pending amendment requests.</p>
          ) : null}
          {amendments.map((amendment) => (
            <Card key={amendment.id} className="partner-amendments__request">
              <div className="booking-confirmation__reference">
                <span>Booking reference</span>
                <strong>{amendment.booking.confirmationCode}</strong>
              </div>
              <div className="booking-confirmation__details">
                <div>
                  <span>Guest</span>
                  <strong>{amendment.booking.guestName}</strong>
                </div>
                <div>
                  <span>Hotel</span>
                  <strong>{amendment.booking.hotelName}</strong>
                </div>
                <div>
                  <span>Room</span>
                  <strong>{amendment.booking.roomName}</strong>
                </div>
                <div>
                  <span>Current stay</span>
                  <strong>
                    {amendment.booking.currentCheckInDate} - {amendment.booking.currentCheckOutDate}
                  </strong>
                </div>
                <div>
                  <span>Requested stay</span>
                  <strong>
                    {amendment.requestedCheckInDate} - {amendment.requestedCheckOutDate}
                  </strong>
                </div>
                <div>
                  <span>Current total</span>
                  <strong>
                    {money(amendment.booking.currentTotalAmount, amendment.booking.currency)}
                  </strong>
                </div>
              </div>
              <p className="booking-confirmation__note">
                <strong>Guest reason:</strong> {amendment.reason}
              </p>
              <div className="manage-booking__document-actions">
                <Button
                  isLoading={reviewingId === amendment.id}
                  onClick={() => review(amendment.id, 'approved')}
                  variant="primary"
                >
                  Approve and reprice
                </Button>
                <Button
                  disabled={reviewingId === amendment.id}
                  onClick={() => review(amendment.id, 'declined')}
                  variant="secondary"
                >
                  Decline
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
