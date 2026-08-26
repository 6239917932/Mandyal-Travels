import Link from 'next/link';
import type { Metadata } from 'next';

import { FlightPaymentForm } from '@/components/flight/FlightPaymentForm';
import { Card } from '@/components/ui/Card';
import { flightService } from '@/services/flightService';
import {
  createFlightSearchCriteria,
  flightSearchCriteriaToQuery,
} from '@/utils/flightSearchCriteria';
import { isDemoTransportCheckoutEnabled } from '@/lib/payments/transportEvidence';

export const metadata: Metadata = { title: 'Flight payment' };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);

export default async function FlightPaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = createFlightSearchCriteria(params);
  const offerId = first(params.offerId);
  const offer = offerId ? await flightService.revalidateOffer(offerId, criteria) : undefined;

  if (!offer) {
    return (
      <div className="flight-booking-page">
        <Card className="flight-booking-page__empty">
          <p className="hotel-page__eyebrow">Fare unavailable</p>
          <h1>Please choose your flight again.</h1>
          <p>The selected offer could not be revalidated before payment.</p>
          <Link className="ui-button ui-button--primary" href="/flights">
            Return to flight search
          </Link>
        </Card>
      </div>
    );
  }

  const segment = offer.segments[0];
  const finalSegment = offer.segments.at(-1) ?? segment;
  const endDate =
    criteria.tripType === 'multi-city'
      ? criteria.multiCitySegments?.at(-1)?.departureDate
      : criteria.returnDate;
  const backQuery = { ...flightSearchCriteriaToQuery(criteria), offerId: offer.id };
  const demoCheckoutEnabled = isDemoTransportCheckoutEnabled();

  return (
    <div className="flight-booking-page flight-payment-page">
      <div className="flight-booking-page__container">
        <p className="hotel-page__eyebrow">Secure payment</p>
        <h1>Complete your flight booking</h1>
        <p className="flight-booking-page__intro">
          {demoCheckoutEnabled
            ? 'Review the total and use the explicitly enabled demonstration checkout below.'
            : 'Review the total. A booking is created only after secure payment confirmation.'}
        </p>
        <div className="flight-payment-page__grid">
          <Card>
            <FlightPaymentForm
              bookingSummary={{
                airlineName: segment.airlineName,
                departureAirport: segment.departureAirport,
                departureDate: criteria.departureDate,
                destinationAirport: finalSegment.arrivalAirport,
                endDate,
                flightNumber: segment.flightNumber,
                total: offer.totalPrice,
              }}
              demoCheckoutEnabled={demoCheckoutEnabled}
              nextQuery={backQuery}
            />
          </Card>
          <Card className="flight-passenger-page__summary">
            <p className="hotel-page__eyebrow">Final booking summary</p>
            <h2>
              {segment.departureAirport} → {segment.arrivalAirport}
            </h2>
            <p>
              {segment.airlineName} · {segment.flightNumber}
            </p>
            <dl>
              <div>
                <dt>Departure</dt>
                <dd>{criteria.departureDate}</dd>
              </div>
              <div>
                <dt>Travelers</dt>
                <dd>
                  {criteria.adults} adult{criteria.adults === 1 ? '' : 's'}
                </dd>
              </div>
              <div className="flight-booking-page__total">
                <dt>Fare before offers</dt>
                <dd>{money(offer.totalPrice)}</dd>
              </div>
            </dl>
            <p className="flight-booking-page__revalidation">Fare revalidated before payment.</p>
            <Link
              className="flight-booking-page__change"
              href={{ pathname: '/flights/booking/passengers', query: backQuery }}
            >
              Back to passenger details
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
