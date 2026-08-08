import Link from 'next/link';
import type { Metadata } from 'next';

import { Card } from '@/components/ui/Card';
import { busService } from '@/services/busService';
import { createBusSearchCriteria } from '@/utils/busSearchCriteria';

export const metadata: Metadata = { title: 'Bus confirmed' };
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);

export default async function BusConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = createBusSearchCriteria(params);
  const offerId = first(params.offerId);
  const confirmationCode = first(params.confirmationCode);
  const seats = (first(params.seats) ?? '').split(',').filter(Boolean);
  const offer = offerId ? await busService.revalidateOffer(offerId, criteria) : undefined;
  if (!offer || !confirmationCode)
    return (
      <div className="bus-booking-page">
        <Card className="flight-booking-page__empty">
          <h1>Confirmation unavailable</h1>
          <Link className="ui-button ui-button--primary" href="/buses">
            Book another bus
          </Link>
        </Card>
      </div>
    );
  const ticketQuery = {
    destination: criteria.destination,
    offerId: offer.id,
    origin: criteria.origin,
    passengers: String(criteria.passengers),
    seats: seats.join(','),
    travelDate: criteria.travelDate,
  };
  return (
    <div className="flight-confirmation-page">
      <div className="flight-confirmation-page__container">
        <div className="flight-confirmation-page__check">✓</div>
        <p className="hotel-page__eyebrow">Bus confirmed</p>
        <h1>Your journey is booked.</h1>
        <Card className="flight-confirmation-page__card">
          <div className="flight-confirmation-page__reference">
            <span>Mandyal Travels booking reference</span>
            <strong>{confirmationCode}</strong>
          </div>
          <dl className="flight-confirmation-page__flight">
            <div>
              <dt>Operator</dt>
              <dd>{offer.operatorName}</dd>
            </div>
            <div>
              <dt>Bus</dt>
              <dd>{offer.busType}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>
                {criteria.origin} → {criteria.destination}
              </dd>
            </div>
            <div>
              <dt>Travel date</dt>
              <dd>{criteria.travelDate}</dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd>{seats.join(', ')}</dd>
            </div>
            <div>
              <dt>Amount paid</dt>
              <dd>{money(offer.totalPrice)}</dd>
            </div>
            <div>
              <dt>Payment status</dt>
              <dd>Captured</dd>
            </div>
          </dl>
          <div className="flight-confirmation-page__actions">
            <Link
              className="ui-button ui-button--primary"
              href={{
                pathname: `/buses/booking/${confirmationCode}/ticket`,
                query: ticketQuery,
              }}
            >
              View ticket
            </Link>
            <Link className="ui-button ui-button--primary" href="/buses">
              Book another bus
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
