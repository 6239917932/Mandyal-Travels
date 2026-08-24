import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { CarOffer, CarSearchCriteria } from '@/types/car';
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);

export function CarOfferCard({
  criteria,
  offer,
}: {
  criteria: CarSearchCriteria;
  offer: CarOffer;
}) {
  return (
    <Card className="car-offer-card">
      <div className="car-offer-card__vehicle">
        <span>{offer.category}</span>
        <strong>{offer.vehicleName}</strong>
        <small>{offer.providerName}</small>
        <small>
          {offer.rentalMode === 'chauffeur' ? 'Chauffeur included' : 'Self-drive rental'}
        </small>
      </div>
      <div className="car-offer-card__facts">
        <strong>{offer.seats} seats</strong>
        <strong>{offer.bags} bags</strong>
        <strong>{offer.transmission}</strong>
        <span>{offer.fuelPolicy}</span>
        <span>{offer.mileagePolicy}</span>
      </div>
      <div className="car-offer-card__details">
        <div>
          {offer.features.map((feature) => (
            <span key={feature}>{feature}</span>
          ))}
        </div>
        <p>{offer.cancellationPolicy}</p>
        <small>{offer.carsRemaining} cars left</small>
      </div>
      <div className="car-offer-card__price">
        <small>Total rental</small>
        <strong>{money(offer.totalPrice)}</strong>
        <small>{money(offer.pricePerDay)} per day</small>
        <Link
          className="ui-button ui-button--primary"
          href={{ pathname: '/cars/booking', query: { ...criteria, offerId: offer.id } }}
        >
          Select car
        </Link>
      </div>
    </Card>
  );
}
