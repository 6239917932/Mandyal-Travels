'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { readJsonResponse } from '@/lib/api/clientResponse';

type BusinessApprovalRequest = {
  bookedAt: string | null;
  bookingReference: string | null;
  bookingTotalAmount: number | null;
  currency: string;
  endDate: string | null;
  estimatedAmount: number;
  id: string;
  policyReason: string;
  productType: string;
  travellerEmail: string;
  travellerName: string;
  reviewNote: string | null;
  startDate: string;
  status: string;
  title: string;
};

type BusinessApprovalQueueProps = { requests: BusinessApprovalRequest[] };

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export function BusinessApprovalQueue({ requests }: BusinessApprovalQueueProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string>();

  async function reviewRequest(requestId: string, status: 'APPROVED' | 'REJECTED') {
    setError('');
    setReviewing(`${requestId}-${status}`);

    try {
      const response = await fetch(
        `/api/v1/business/travel-requests/${encodeURIComponent(requestId)}`,
        {
          body: JSON.stringify({ reviewNote: notes[requestId] ?? '', status }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      );
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};

      if (!response.ok) {
        setError(result.error ?? 'The request could not be reviewed.');
        return;
      }

      router.refresh();
    } catch {
      setError('The approval service could not be reached. Please try again.');
    } finally {
      setReviewing(undefined);
    }
  }

  if (requests.length === 0) {
    return (
      <Card className="account-trips__empty">
        <strong>No company travel requests yet.</strong>
        <p>Requests submitted by organization members will appear here.</p>
      </Card>
    );
  }

  return (
    <div className="account-trips__list">
      {requests.map((request) => (
        <Card className="account-trip" key={request.id}>
          <div className="account-trip__topline">
            <span className="account-trip__type">{request.productType}</span>
            <strong
              className={`business-request__status business-request__status--${request.status.toLowerCase()}`}
            >
              {request.status}
            </strong>
          </div>
          <div className="account-trip__body">
            <div>
              <h3>{request.title}</h3>
              <p>
                {request.travellerName} · {request.travellerEmail}
              </p>
              <small>{request.policyReason}</small>
            </div>
            <dl>
              <div>
                <dt>Travel dates</dt>
                <dd>
                  {request.startDate}
                  {request.endDate ? ` to ${request.endDate}` : ''}
                </dd>
              </div>
              <div>
                <dt>Estimated amount</dt>
                <dd>{formatCurrency(request.estimatedAmount, request.currency)}</dd>
              </div>
              <div>
                <dt>Decision note</dt>
                <dd>{request.reviewNote || '—'}</dd>
              </div>
              {request.bookingReference ? (
                <div>
                  <dt>Booking reference</dt>
                  <dd>{request.bookingReference}</dd>
                </div>
              ) : null}
              {request.bookingTotalAmount !== null ? (
                <div>
                  <dt>Booked amount</dt>
                  <dd>{formatCurrency(request.bookingTotalAmount, request.currency)}</dd>
                </div>
              ) : null}
              {request.bookedAt ? (
                <div>
                  <dt>Booked on</dt>
                  <dd>{new Date(request.bookedAt).toLocaleDateString('en-IN')}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          {request.status === 'PENDING' ? (
            <div className="business-approval__review">
              <label className="ui-field__label" htmlFor={`review-note-${request.id}`}>
                Review note (optional)
              </label>
              <textarea
                className="ui-input business-approval__note"
                id={`review-note-${request.id}`}
                maxLength={500}
                onChange={(event) =>
                  setNotes((current) => ({ ...current, [request.id]: event.target.value }))
                }
                value={notes[request.id] ?? ''}
              />
              <div className="business-approval__actions">
                <Button
                  disabled={reviewing?.startsWith(`${request.id}-`)}
                  isLoading={reviewing === `${request.id}-APPROVED`}
                  onClick={() => reviewRequest(request.id, 'APPROVED')}
                  variant="primary"
                >
                  Approve request
                </Button>
                <Button
                  disabled={reviewing?.startsWith(`${request.id}-`)}
                  isLoading={reviewing === `${request.id}-REJECTED`}
                  onClick={() => reviewRequest(request.id, 'REJECTED')}
                  variant="secondary"
                >
                  Reject request
                </Button>
              </div>
            </div>
          ) : null}
          <div className="account-trip__actions">
            <Link
              className="ui-button ui-button--secondary"
              href={`/business/requests/${request.id}`}
            >
              View request record
            </Link>
          </div>
        </Card>
      ))}
      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
