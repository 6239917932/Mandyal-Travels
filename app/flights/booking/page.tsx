import Link from 'next/link';
import type { Metadata } from 'next';

import { Card } from '@/components/ui/Card';
import { flightService } from '@/services/flightService';
import { createFlightSearchCriteria } from '@/utils/flightSearchCriteria';

export const metadata: Metadata = { title: 'Review flight' };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
const time = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

export default async function FlightBookingReviewPage({
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
          <p>The selected offer could not be revalidated for the requested route and travelers.</p>
          <Link className="ui-button ui-button--primary" href="/flights">
            Return to flight search
          </Link>
        </Card>
      </div>
    );
  }

  const segment = offer.segments[0];
  return (
    <div className="flight-booking-page">
      <div className="flight-booking-page__container">
        <p className="hotel-page__eyebrow">Fare review</p>
        <h1>Review your flight</h1>
        <p className="flight-booking-page__intro">
          Confirm the itinerary, baggage, fare conditions, and price before entering passenger
          details.
        </p>

        <div className="flight-booking-page__grid">
          <Card className="flight-booking-page__itinerary">
            <div className="flight-booking-page__airline">
              <span>{segment.airlineCode}</span>
              <div>
                <strong>{segment.airlineName}</strong>
                <small>
                  {segment.flightNumber} · {offer.fareFamily} · {criteria.cabinClass}
                </small>
              </div>
            </div>
            <div className="flight-booking-page__routes">
              {offer.segments.map((itinerarySegment) => (
                <div
                  className="flight-booking-page__route"
                  key={`${itinerarySegment.leg}-${itinerarySegment.flightNumber}`}
                >
                  <div>
                    <small>{itinerarySegment.leg === 'outbound' ? 'Outbound' : 'Return'}</small>
                    <strong>{time(itinerarySegment.departureAt)}</strong>
                    <span>{itinerarySegment.departureAirport}</span>
                  </div>
                  <div>
                    <span>
                      {itinerarySegment.stops === 0
                        ? 'Non-stop'
                        : `${itinerarySegment.stops} stop`}
                    </span>
                    <small>{itinerarySegment.departureAt.slice(0, 10)}</small>
                  </div>
                  <div>
                    <small>{itinerarySegment.flightNumber}</small>
                    <strong>{time(itinerarySegment.arrivalAt)}</strong>
                    <span>{itinerarySegment.arrivalAirport}</span>
                  </div>
                </div>
              ))}
            </div>
            <dl className="flight-booking-page__facts">
              <div>
                <dt>Travelers</dt>
                <dd>
                  {criteria.adults} adult{criteria.adults === 1 ? '' : 's'}
                </dd>
              </div>
              <div>
                <dt>Baggage</dt>
                <dd>{offer.baggage}</dd>
              </div>
              <div>
                <dt>Fare rule</dt>
                <dd>{offer.refundable ? 'Refundable' : 'Non-refundable'}</dd>
              </div>
              <div>
                <dt>Supplier</dt>
                <dd>{offer.supplier}</dd>
              </div>
            </dl>
          </Card>

          <Card className="flight-booking-page__price">
            <h2>Price summary</h2>
            <dl>
              <div>
                <dt>
                  {money(offer.pricePerAdult)} × {criteria.adults} adult
                  {criteria.adults === 1 ? '' : 's'}
                </dt>
                <dd>{money(offer.totalPrice)}</dd>
              </div>
              <div className="flight-booking-page__total">
                <dt>Total</dt>
                <dd>{money(offer.totalPrice)}</dd>
              </div>
            </dl>
            <p className="flight-booking-page__revalidation">Fare revalidated for this review.</p>
            <Link
              className="ui-button ui-button--accent ui-button--full-width"
              href={{
                pathname: '/flights/booking/passengers',
                query: {
                  adults: criteria.adults,
                  cabinClass: criteria.cabinClass,
                  departureDate: criteria.departureDate,
                  destination: criteria.destination,
                  offerId: offer.id,
                  origin: criteria.origin,
                  returnDate: criteria.returnDate,
                  tripType: criteria.tripType,
                },
              }}
            >
              Continue to passenger details
            </Link>
            <Link
              className="flight-booking-page__change"
              href={{
                pathname: '/flights',
                query: {
                  adults: criteria.adults,
                  cabinClass: criteria.cabinClass,
                  departureDate: criteria.departureDate,
                  destination: criteria.destination,
                  origin: criteria.origin,
                  tripType: criteria.tripType,
                },
              }}
            >
              Choose another flight
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
