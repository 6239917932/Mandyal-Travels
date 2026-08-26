import Link from 'next/link';
import type { Metadata } from 'next';

import { BusPassengerForm } from '@/components/bus/BusPassengerForm';
import { Card } from '@/components/ui/Card';
import { busService } from '@/services/busService';
import { createBusSearchCriteria } from '@/utils/busSearchCriteria';

export const metadata: Metadata = { title: 'Bus passenger details' };
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);

export default async function BusPassengersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = createBusSearchCriteria(params);
  const offerId = first(params.offerId);
  const seats = (first(params.seats) ?? '').split(',').filter(Boolean);
  const seatHoldId = first(params.seatHoldId);
  const offer = offerId ? await busService.revalidateOffer(offerId, criteria) : undefined;
  const directTrip = offerId?.startsWith('direct-bus-trip-') ?? false;
  if (!offer || seats.length !== criteria.passengers || (directTrip && !seatHoldId)) {
    return (
      <div className="bus-booking-page">
        <Card className="flight-booking-page__empty">
          <h1>Seat selection required</h1>
          <p>Please select and hold your seats before entering passenger details.</p>
          <Link className="ui-button ui-button--primary" href="/buses">
            Return to bus search
          </Link>
        </Card>
      </div>
    );
  }
  const nextQuery = {
    destination: criteria.destination,
    offerId: offer.id,
    origin: criteria.origin,
    passengers: String(criteria.passengers),
    seats: seats.join(','),
    ...(seatHoldId ? { seatHoldId } : {}),
    travelDate: criteria.travelDate,
  };
  return (
    <div className="bus-booking-page">
      <div className="bus-booking-page__container">
        <p className="hotel-page__eyebrow">Passenger details</p>
        <h1>Who is travelling?</h1>
        <p className="flight-booking-page__intro">
          Enter the details for each passenger assigned to the selected seats.
        </p>
        <div className="bus-booking-page__grid">
          <Card>
            <BusPassengerForm
              nextQuery={nextQuery}
              passengers={criteria.passengers}
              travelDate={criteria.travelDate}
            />
          </Card>
          <Card className="bus-booking-page__summary">
            <p className="hotel-page__eyebrow">Trip summary</p>
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
                <dt>Selected seats</dt>
                <dd>{seats.join(', ')}</dd>
              </div>
              <div>
                <dt>Passengers</dt>
                <dd>{criteria.passengers}</dd>
              </div>
              <div className="flight-booking-page__total">
                <dt>Total</dt>
                <dd>{money(offer.totalPrice)}</dd>
              </div>
            </dl>
            <p className="flight-booking-page__revalidation">
              Seats held for this browser session.
            </p>
            <Link
              className="flight-booking-page__change"
              href={{
                pathname: '/buses/booking/seats',
                query: {
                  destination: criteria.destination,
                  offerId: offer.id,
                  origin: criteria.origin,
                  passengers: String(criteria.passengers),
                  travelDate: criteria.travelDate,
                },
              }}
            >
              Back to seat selection
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
