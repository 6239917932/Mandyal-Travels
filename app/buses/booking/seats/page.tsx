import Link from 'next/link';
import type { Metadata } from 'next';

import { BusSeatSelector } from '@/components/bus/BusSeatSelector';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { directBusTripId } from '@/lib/bus/bookingRules';
import { busSeatHoldService } from '@/services/busSeatHoldService';
import { busService } from '@/services/busService';
import { createBusSearchCriteria } from '@/utils/busSearchCriteria';

export const metadata: Metadata = { title: 'Select bus seats' };
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);

export default async function BusSeatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = createBusSearchCriteria(params);
  const offerId = first(params.offerId);
  const offer = offerId ? await busService.revalidateOffer(offerId, criteria) : undefined;
  if (!offer)
    return (
      <div className="bus-booking-page">
        <Card className="flight-booking-page__empty">
          <h1>Bus unavailable</h1>
          <p>Please select another service.</p>
          <Link className="ui-button ui-button--primary" href="/buses">
            Return to bus search
          </Link>
        </Card>
      </div>
    );

  const directTrip = Boolean(directBusTripId(offer.id));
  const user = directTrip ? await getCurrentUser() : null;
  const blockedSeats = directTrip
    ? await busSeatHoldService.unavailableSeats(offer.id, new Date(), user?.id)
    : offer.id.includes('northern')
      ? ['1A', '1D', '2B', '3C', '4A', '5D']
      : ['1B', '2A', '2D', '4C', '5B'];
  return (
    <div className="bus-booking-page">
      <div className="bus-booking-page__container">
        <p className="hotel-page__eyebrow">Seat selection</p>
        <h1>Choose your seats</h1>
        <p className="flight-booking-page__intro">
          Select exactly {criteria.passengers} seat{criteria.passengers === 1 ? '' : 's'} for this
          booking.
        </p>
        <div className="bus-booking-page__grid">
          <Card>
            <BusSeatSelector
              blockedSeats={blockedSeats}
              nextQuery={{
                destination: criteria.destination,
                offerId: offer.id,
                origin: criteria.origin,
                passengers: String(criteria.passengers),
                travelDate: criteria.travelDate,
              }}
              passengers={criteria.passengers}
              pricePerSeat={offer.pricePerSeat}
              requiresServerHold={directTrip}
            />
          </Card>
          <Card className="bus-booking-page__summary">
            <p className="hotel-page__eyebrow">Trip summary</p>
            <h2>{offer.operatorName}</h2>
            <p>{offer.busType}</p>
            <dl>
              <div>
                <dt>Route</dt>
                <dd>
                  {criteria.origin} → {criteria.destination}
                </dd>
              </div>
              <div>
                <dt>Travel date</dt>
                <dd>{criteria.travelDate}</dd>
              </div>
              <div>
                <dt>Boarding</dt>
                <dd>{offer.boardingPoint}</dd>
              </div>
              <div>
                <dt>Dropping</dt>
                <dd>{offer.droppingPoint}</dd>
              </div>
              <div>
                <dt>Per seat</dt>
                <dd>{money(offer.pricePerSeat)}</dd>
              </div>
              <div className="flight-booking-page__total">
                <dt>Booking total</dt>
                <dd>{money(offer.totalPrice)}</dd>
              </div>
            </dl>
            <p className="flight-booking-page__revalidation">
              Availability revalidated for this selection.
            </p>
            <Link
              className="flight-booking-page__change"
              href={{
                pathname: '/buses',
                query: {
                  origin: criteria.origin,
                  destination: criteria.destination,
                  travelDate: criteria.travelDate,
                  passengers: String(criteria.passengers),
                },
              }}
            >
              Choose another bus
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
