import Link from 'next/link';
import type { Metadata } from 'next';

import { FlightPassengerForm } from '@/components/flight/FlightPassengerForm';
import { Card } from '@/components/ui/Card';
import { flightService } from '@/services/flightService';
import { createFlightSearchCriteria, flightSearchCriteriaToQuery } from '@/utils/flightSearchCriteria';

export const metadata: Metadata = { title: 'Passenger details' };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);

export default async function FlightPassengersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = createFlightSearchCriteria(params);
  const offerId = first(params.offerId);
  const offer = offerId ? await flightService.revalidateOffer(offerId, criteria) : undefined;

  if (!offer) {
    return (
      <div className="flight-booking-page">
        <Card className="flight-booking-page__empty">
          <p className="hotel-page__eyebrow">Fare unavailable</p>
          <h1>Please choose your flight again.</h1>
          <p>The selected offer could not be revalidated before collecting passenger details.</p>
          <Link className="ui-button ui-button--primary" href="/flights">
            Return to flight search
          </Link>
        </Card>
      </div>
    );
  }

  const segment = offer.segments[0];
  const nextQuery = { ...flightSearchCriteriaToQuery(criteria), offerId: offer.id };

  return (
    <div className="flight-booking-page flight-passenger-page">
      <div className="flight-booking-page__container">
        <p className="hotel-page__eyebrow">Passenger details</p>
        <h1>Who is flying?</h1>
        <p className="flight-booking-page__intro">
          Enter each traveler exactly as their name appears on government-issued identification.
        </p>
        <div className="flight-passenger-page__grid">
          <Card>
            <FlightPassengerForm adults={criteria.adults} nextQuery={nextQuery} />
          </Card>
          <Card className="flight-passenger-page__summary">
            <p className="hotel-page__eyebrow">Flight summary</p>
            <h2>
              {segment.departureAirport} → {segment.arrivalAirport}
            </h2>
            <p>
              {segment.airlineName} · {segment.flightNumber}
            </p>
            <dl>
              <div>
                <dt>Departure</dt>
                <dd>{criteria.departureDate}</dd>
              </div>
              <div>
                <dt>Travelers</dt>
                <dd>
                  {criteria.adults} adult{criteria.adults === 1 ? '' : 's'}
                </dd>
              </div>
              <div className="flight-booking-page__total">
                <dt>Total</dt>
                <dd>{money(offer.totalPrice)}</dd>
              </div>
            </dl>
            <p className="flight-booking-page__revalidation">
              Fare revalidated before passenger entry.
            </p>
            <Link
              className="flight-booking-page__change"
              href={{ pathname: '/flights/booking', query: nextQuery }}
            >
              Back to fare review
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
