import Link from 'next/link';
import type { Metadata } from 'next';

import { BusPaymentForm } from '@/components/bus/BusPaymentForm';
import { Card } from '@/components/ui/Card';
import { busService } from '@/services/busService';
import { createBusSearchCriteria } from '@/utils/busSearchCriteria';
import { isDemoTransportCheckoutEnabled } from '@/lib/payments/transportEvidence';

export const metadata: Metadata = { title: 'Bus payment' };
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);

export default async function BusPaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = createBusSearchCriteria(params);
  const offerId = first(params.offerId);
  const seats = (first(params.seats) ?? '').split(',').filter(Boolean);
  const offer = offerId ? await busService.revalidateOffer(offerId, criteria) : undefined;
  if (!offer || seats.length !== criteria.passengers)
    return (
      <div className="bus-booking-page">
        <Card className="flight-booking-page__empty">
          <h1>Booking details unavailable</h1>
          <Link className="ui-button ui-button--primary" href="/buses">
            Return to bus search
          </Link>
        </Card>
      </div>
    );
  const query = {
    destination: criteria.destination,
    offerId: offer.id,
    origin: criteria.origin,
    passengers: String(criteria.passengers),
    seats: seats.join(','),
    travelDate: criteria.travelDate,
  };
  const demoCheckoutEnabled = isDemoTransportCheckoutEnabled();
  return (
    <div className="bus-booking-page">
      <div className="bus-booking-page__container">
        <p className="hotel-page__eyebrow">Secure payment</p>
        <h1>Complete your bus booking</h1>
        <p className="flight-booking-page__intro">
          {demoCheckoutEnabled
            ? 'Review the trip and use the explicitly enabled demonstration checkout below.'
            : 'Review the trip. A booking is created only after secure payment confirmation.'}
        </p>
        <div className="bus-booking-page__grid">
          <Card>
            <BusPaymentForm
              bookingSummary={{
                operatorName: offer.operatorName,
                origin: criteria.origin,
                destination: criteria.destination,
                travelDate: criteria.travelDate,
                seats: seats.join(','),
                total: offer.totalPrice,
              }}
              demoCheckoutEnabled={demoCheckoutEnabled}
              nextQuery={query}
            />
          </Card>
          <Card className="bus-booking-page__summary">
            <p className="hotel-page__eyebrow">Final booking summary</p>
            <h2>{offer.operatorName}</h2>
            <dl>
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
              <div className="flight-booking-page__total">
                <dt>Fare before offers</dt>
                <dd>{money(offer.totalPrice)}</dd>
              </div>
            </dl>
            <p className="flight-booking-page__revalidation">
              Seats and fare revalidated before payment.
            </p>
            <Link
              className="flight-booking-page__change"
              href={{ pathname: '/buses/booking/passengers', query }}
            >
              Back to passenger details
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
