import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import type { FlightOffer, FlightSearchCriteria } from '@/types/flight';
import { flightSearchCriteriaToQuery } from '@/utils/flightSearchCriteria';

const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
const time = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export function FlightOfferCard({
  criteria,
  offer,
}: {
  criteria: FlightSearchCriteria;
  offer: FlightOffer;
}) {
  const segment = offer.segments[0];
  return (
    <Card className="flight-offer-card">
      <div className="flight-offer-card__airline">
        <span>{segment.airlineCode}</span>
        <div>
          <strong>{segment.airlineName}</strong>
          <small>
            {segment.flightNumber} · {offer.fareFamily}
          </small>
        </div>
      </div>
      <div className="flight-offer-card__routes">
        {offer.segments.map((itinerarySegment) => (
          <div
            className="flight-offer-card__route"
            key={`${itinerarySegment.leg}-${itinerarySegment.flightNumber}`}
          >
            <div>
              <small>
                {itinerarySegment.leg === 'outbound'
                  ? 'Outbound'
                  : itinerarySegment.leg === 'return'
                    ? 'Return'
                    : `Flight ${(itinerarySegment.journeyIndex ?? 0) + 1}`}
              </small>
              <strong>{time(itinerarySegment.departureAt)}</strong>
              <span>{itinerarySegment.departureAirport}</span>
            </div>
            <div className="flight-offer-card__duration">
              <span>{duration(itinerarySegment.durationMinutes)}</span>
              <i />
              <small>
                {itinerarySegment.stops === 0 ? 'Non-stop' : `${itinerarySegment.stops} stop`}
              </small>
            </div>
            <div>
              <small>{itinerarySegment.departureAt.slice(0, 10)}</small>
              <strong>{time(itinerarySegment.arrivalAt)}</strong>
              <span>{itinerarySegment.arrivalAirport}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flight-offer-card__details">
        <span>{offer.baggage}</span>
        <span>{offer.refundable ? 'Refundable fare' : 'Non-refundable fare'}</span>
        <span>{offer.seatsRemaining} seats left</span>
        <small>Source: {offer.supplier}</small>
      </div>
      <div className="flight-offer-card__price">
        <small>Total for all adults</small>
        <strong>{money(offer.totalPrice)}</strong>
        <Link
          className="ui-button ui-button--primary"
          href={{
            pathname: '/flights/booking',
            query: { ...flightSearchCriteriaToQuery(criteria), offerId: offer.id },
          }}
        >
          Select flight
        </Link>
      </div>
    </Card>
  );
}
