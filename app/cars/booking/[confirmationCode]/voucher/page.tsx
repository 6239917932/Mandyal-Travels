import Link from 'next/link';
import type { Metadata } from 'next';
import { PrintDocumentButton } from '@/components/booking/PrintDocumentButton';
import { CarPaidAmount } from '@/components/car/CarPaidAmount';
import { carService } from '@/services/carService';
import { createCarSearchCriteria } from '@/utils/carSearchCriteria';
import { hasOwnedTravelConfirmation } from '@/lib/travelConfirmationAccess';
export const metadata: Metadata = { title: 'Car rental voucher' };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
export default async function CarVoucherPage({
  params,
  searchParams,
}: {
  params: Promise<{ confirmationCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { confirmationCode } = await params;
  const queryParams = await searchParams,
    criteria = createCarSearchCriteria(queryParams),
    offerId = first(queryParams.offerId);
  const [offer, ownsConfirmation] = await Promise.all([
    offerId ? carService.revalidateOffer(offerId, criteria) : undefined,
    hasOwnedTravelConfirmation(confirmationCode, 'CAR'),
  ]);
  if (!offer || !ownsConfirmation)
    return (
      <div className="car-booking-page">
        <p>Rental voucher unavailable.</p>
      </div>
    );
  return (
    <div className="booking-document-page">
      <div className="booking-document-actions">
        <Link href="/cars">← Back to cars</Link>
        <PrintDocumentButton label="Print voucher" />
      </div>
      <article className="booking-document car-voucher">
        <header className="booking-document__header">
          <div>
            <p className="booking-document__brand">Mandyal Travels</p>
            <h1>Car rental voucher</h1>
          </div>
          <p className="booking-document__status">
            <span>Booking status</span>
            <strong>CONFIRMED</strong>
          </p>
        </header>
        <div className="booking-document__reference">
          <span>Booking reference</span>
          <strong>{confirmationCode}</strong>
        </div>
        <section className="booking-document__section">
          <h2>Rental details</h2>
          <dl className="booking-document__grid">
            <div>
              <dt>Provider</dt>
              <dd>{offer.providerName}</dd>
            </div>
            <div>
              <dt>Vehicle</dt>
              <dd>{offer.vehicleName}</dd>
            </div>
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
              <dt>Rental type</dt>
              <dd>{offer.rentalMode === 'chauffeur' ? 'With chauffeur' : 'Self-drive'}</dd>
            </div>
            <div>
              <dt>Transmission</dt>
              <dd>{offer.transmission}</dd>
            </div>
            <div>
              <dt>Fuel policy</dt>
              <dd>{offer.fuelPolicy}</dd>
            </div>
            <div>
              <dt>Mileage</dt>
              <dd>{offer.mileagePolicy}</dd>
            </div>
          </dl>
        </section>
        <div className="booking-document__total">
          <span>Amount paid</span>
          <CarPaidAmount
            confirmationCode={confirmationCode}
            fallbackTotal={offer.totalPrice}
            inline
          />
        </div>
        <footer className="booking-document__footer">
          {offer.rentalMode === 'chauffeur'
            ? 'Present this voucher and the lead traveller’s government-issued identification at pickup. Chauffeur assignment is confirmed by the provider.'
            : 'Present this voucher, the primary driver’s original licence, payment card, and government-issued identification at pickup.'}{' '}
          This is a prototype voucher.
        </footer>
      </article>
    </div>
  );
}
