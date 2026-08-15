import Link from 'next/link';
import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { carService, rentalDays } from '@/services/carService';
import { createCarSearchCriteria } from '@/utils/carSearchCriteria';
export const metadata: Metadata = { title: 'Review car rental' };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(n);
export default async function CarBookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = createCarSearchCriteria(params);
  const offerId = first(params.offerId);
  const offer = offerId ? await carService.revalidateOffer(offerId, criteria) : undefined;
  if (!offer)
    return (
      <div className="car-booking-page">
        <Card className="flight-booking-page__empty">
          <h1>Car unavailable</h1>
          <p>Please choose another vehicle.</p>
          <Link className="ui-button ui-button--primary" href="/cars">
            Return to car search
          </Link>
        </Card>
      </div>
    );
  const query = { ...criteria, drivers: String(criteria.drivers), offerId: offer.id };
  return (
    <div className="car-booking-page">
      <div className="car-booking-page__container">
        <p className="hotel-page__eyebrow">Rental review</p>
        <h1>Review your car</h1>
        <p className="flight-booking-page__intro">
          Confirm the vehicle, rental dates, policies, and price before entering driver details.
        </p>
        <div className="car-booking-page__grid">
          <Card>
            <h2>{offer.vehicleName}</h2>
            <p>
              {offer.providerName} · {offer.category}
            </p>
            <dl>
              <div>
                <dt>Pickup</dt>
                <dd>
                  {criteria.pickupLocation} · {criteria.pickupDate} at {criteria.pickupTime}
                </dd>
              </div>
              <div>
                <dt>Drop-off</dt>
                <dd>
                  {criteria.dropoffLocation} · {criteria.dropoffDate} at {criteria.dropoffTime}
                </dd>
              </div>
              <div>
                <dt>Rental duration</dt>
                <dd>
                  {rentalDays(
                    criteria.pickupDate,
                    criteria.dropoffDate,
                    criteria.pickupTime,
                    criteria.dropoffTime,
                  )}{' '}
                  billed days
                </dd>
              </div>
              <div>
                <dt>Rental type</dt>
                <dd>{offer.rentalMode === 'chauffeur' ? 'With chauffeur' : 'Self-drive'}</dd>
              </div>
              <div>
                <dt>Transmission</dt>
                <dd>{offer.transmission}</dd>
              </div>
              <div>
                <dt>Mileage</dt>
                <dd>{offer.mileagePolicy}</dd>
              </div>
              <div>
                <dt>Fuel policy</dt>
                <dd>{offer.fuelPolicy}</dd>
              </div>
            </dl>
          </Card>
          <Card className="car-booking-page__summary">
            <h2>Price summary</h2>
            <dl>
              <div>
                <dt>Rental total</dt>
                <dd>{money(offer.totalPrice)}</dd>
              </div>
            </dl>
            <p className="flight-booking-page__revalidation">
              Vehicle and price revalidated for this review.
            </p>
            <Link
              className="ui-button ui-button--accent ui-button--full-width"
              href={{ pathname: '/cars/booking/driver', query }}
            >
              Continue to driver details
            </Link>
            <Link className="flight-booking-page__change" href="/cars">
              Choose another car
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
