import Link from 'next/link';
import type { Metadata } from 'next';
import { CarPaymentForm } from '@/components/car/CarPaymentForm';
import { Card } from '@/components/ui/Card';
import { carService } from '@/services/carService';
import { createCarSearchCriteria } from '@/utils/carSearchCriteria';
export const metadata: Metadata = { title: 'Car rental payment' };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(n);
export default async function CarPaymentPage({
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
          <h1>Rental unavailable</h1>
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
        <p className="hotel-page__eyebrow">Secure payment</p>
        <h1>Complete your car rental</h1>
        <p className="flight-booking-page__intro">
          Review the total and use the demonstration payment form.
        </p>
        <div className="car-booking-page__grid">
          <Card>
            <CarPaymentForm
              bookingSummary={{
                vehicleName: offer.vehicleName,
                providerName: offer.providerName,
                pickupLocation: criteria.pickupLocation,
                dropoffLocation: criteria.dropoffLocation,
                pickupDate: criteria.pickupDate,
                dropoffDate: criteria.dropoffDate,
                total: offer.totalPrice,
              }}
              nextQuery={query}
            />
          </Card>
          <Card className="car-booking-page__summary">
            <p className="hotel-page__eyebrow">Final rental summary</p>
            <h2>{offer.vehicleName}</h2>
            <dl>
              <div>
                <dt>Dates</dt>
                <dd>
                  {criteria.pickupDate} to {criteria.dropoffDate}
                </dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{money(offer.totalPrice)}</dd>
              </div>
            </dl>
            <p className="flight-booking-page__revalidation">
              Vehicle and price revalidated before payment.
            </p>
            <Link
              className="flight-booking-page__change"
              href={{ pathname: '/cars/booking/driver', query }}
            >
              Back to driver details
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
