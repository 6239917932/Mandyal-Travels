import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import type { FlightOffer, FlightSearchCriteria } from '@/types/flight';

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
      <div className="flight-offer-card__route">
        <div>
          <strong>{time(segment.departureAt)}</strong>
          <span>{segment.departureAirport}</span>
        </div>
        <div className="flight-offer-card__duration">
          <span>{duration(segment.durationMinutes)}</span>
          <i />
          <small>{segment.stops === 0 ? 'Non-stop' : `${segment.stops} stop`}</small>
        </div>
        <div>
          <strong>{time(segment.arrivalAt)}</strong>
          <span>{segment.arrivalAirport}</span>
        </div>
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
          Select flight
        </Link>
      </div>
    </Card>
  );
}
