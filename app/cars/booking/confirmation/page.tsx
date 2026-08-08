import Link from 'next/link';
import type { Metadata } from 'next';
import { CarConfirmationDetails } from '@/components/car/CarConfirmationDetails';
import { Card } from '@/components/ui/Card';
import { carService } from '@/services/carService';
import { createCarSearchCriteria } from '@/utils/carSearchCriteria';
export const metadata: Metadata = { title: 'Car rental confirmed' };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(n);
export default async function CarConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    criteria = createCarSearchCriteria(params),
    offerId = first(params.offerId),
    confirmationCode = first(params.confirmationCode),
    offer = offerId ? await carService.revalidateOffer(offerId, criteria) : undefined;
  if (!offer || !confirmationCode)
    return (
      <div className="car-booking-page">
        <Card className="flight-booking-page__empty">
          <h1>Confirmation unavailable</h1>
          <Link className="ui-button ui-button--primary" href="/cars">
            Book another car
          </Link>
        </Card>
      </div>
    );
  const query = { ...criteria, drivers: String(criteria.drivers), offerId: offer.id };
  return (
    <div className="flight-confirmation-page">
      <div className="flight-confirmation-page__container">
        <div className="flight-confirmation-page__check">✓</div>
        <p className="hotel-page__eyebrow">Car rental confirmed</p>
        <h1>Your car is reserved.</h1>
        <Card className="flight-confirmation-page__card">
          <div className="flight-confirmation-page__reference">
            <span>Mandyal Travels booking reference</span>
            <strong>{confirmationCode}</strong>
          </div>
          <dl className="flight-confirmation-page__flight">
            <div>
              <dt>Vehicle</dt>
              <dd>{offer.vehicleName}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{offer.providerName}</dd>
            </div>
            <div>
              <dt>Pickup</dt>
              <dd>
                {criteria.pickupLocation} · {criteria.pickupDate}
              </dd>
            </div>
            <div>
              <dt>Drop-off</dt>
              <dd>
                {criteria.dropoffLocation} · {criteria.dropoffDate}
              </dd>
            </div>
            <div>
              <CarConfirmationDetails confirmationCode={confirmationCode} />
            </div>
            <div>
              <dt>Amount paid</dt>
              <dd>{money(offer.totalPrice)}</dd>
            </div>
            <div>
              <dt>Payment status</dt>
              <dd>Captured</dd>
            </div>
          </dl>
          <div className="flight-confirmation-page__actions">
            <Link
              className="ui-button ui-button--primary"
              href={{ pathname: `/cars/booking/${confirmationCode}/voucher`, query }}
            >
              View rental voucher
            </Link>
            <Link className="ui-button ui-button--primary" href="/cars">
              Book another car
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
