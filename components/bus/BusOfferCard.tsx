import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import type { BusOffer, BusSearchCriteria } from '@/types/bus';

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

export function BusOfferCard({
  criteria,
  offer,
}: {
  criteria: BusSearchCriteria;
  offer: BusOffer;
}) {
  return (
    <Card className="bus-offer-card">
      <div className="bus-offer-card__operator">
        <strong>{offer.operatorName}</strong>
        <span>{offer.busType}</span>
        <small>★ {offer.rating.toFixed(1)}</small>
      </div>
      <div className="bus-offer-card__route">
        <div>
          <strong>{time(offer.departureAt)}</strong>
          <span>{offer.boardingPoint}</span>
        </div>
        <i>→</i>
        <div>
          <strong>{time(offer.arrivalAt)}</strong>
          <span>{offer.droppingPoint}</span>
        </div>
      </div>
      <div className="bus-offer-card__details">
        <div>
          {offer.amenities.map((amenity) => (
            <span key={amenity}>{amenity}</span>
          ))}
        </div>
        <p>{offer.cancellationPolicy}</p>
        <small>
          {offer.seatsRemaining} seats left · Source: {offer.source}
        </small>
      </div>
      <div className="bus-offer-card__price">
        <small>Total</small>
        <strong>{money(offer.totalPrice)}</strong>
        <Link
          className="ui-button ui-button--primary"
          href={{
            pathname: '/buses/booking/seats',
            query: {
              destination: criteria.destination,
              offerId: offer.id,
              origin: criteria.origin,
              passengers: criteria.passengers,
              travelDate: criteria.travelDate,
            },
          }}
        >
          Select seats
        </Link>
      </div>
    </Card>
  );
}
