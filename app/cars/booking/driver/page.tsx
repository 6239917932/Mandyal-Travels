import Link from 'next/link';
import type { Metadata } from 'next';
import { CarDriverForm } from '@/components/car/CarDriverForm';
import { Card } from '@/components/ui/Card';
import { carService } from '@/services/carService';
import { createCarSearchCriteria } from '@/utils/carSearchCriteria';
export const metadata: Metadata = { title: 'Driver details' };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(n);
export default async function CarDriverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    criteria = createCarSearchCriteria(params),
    offerId = first(params.offerId),
    offer = offerId ? await carService.revalidateOffer(offerId, criteria) : undefined;
  if (!offer)
    return (
      <div className="car-booking-page">
        <Card className="flight-booking-page__empty">
          <h1>Rental details unavailable</h1>
          <Link className="ui-button ui-button--primary" href="/cars">
            Return to search
          </Link>
        </Card>
      </div>
    );
  const query = { ...criteria, drivers: String(criteria.drivers), offerId: offer.id };
  return (
    <div className="car-booking-page">
      <div className="car-booking-page__container">
        <p className="hotel-page__eyebrow">Booking party</p>
        <h1>{criteria.rentalMode === 'chauffeur' ? 'Who is travelling?' : 'Who is driving?'}</h1>
        <p className="flight-booking-page__intro">
          Enter the {criteria.rentalMode === 'chauffeur' ? 'lead traveller' : 'primary driver'} and
          booking contact information.
        </p>
        <div className="car-booking-page__grid">
          <Card>
            <CarDriverForm
              nextQuery={query}
              pickupDate={criteria.pickupDate}
              rentalMode={criteria.rentalMode}
            />
          </Card>
          <Card className="car-booking-page__summary">
            <p className="hotel-page__eyebrow">Rental summary</p>
            <h2>{offer.vehicleName}</h2>
            <dl>
              <div>
                <dt>Rental period</dt>
                <dd>
                  {criteria.pickupDate} {criteria.pickupTime} to {criteria.dropoffDate}{' '}
                  {criteria.dropoffTime}
                </dd>
              </div>
              <div>
                <dt>Pickup</dt>
                <dd>{criteria.pickupLocation}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{money(offer.totalPrice)}</dd>
              </div>
            </dl>
            <p className="flight-booking-page__revalidation">Vehicle availability revalidated.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
