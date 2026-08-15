import type { Metadata } from 'next';

import { FlightConfirmationDetails } from '@/components/flight/FlightConfirmationDetails';
import { FlightPaidAmount } from '@/components/flight/FlightPaidAmount';
import { Card } from '@/components/ui/Card';
import { flightService } from '@/services/flightService';
import {
  createFlightSearchCriteria,
  flightSearchCriteriaToQuery,
} from '@/utils/flightSearchCriteria';
import { hasOwnedTravelConfirmation } from '@/lib/travelConfirmationAccess';

export const metadata: Metadata = { title: 'Flight confirmed' };
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function FlightConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = createFlightSearchCriteria(params);
  const offerId = first(params.offerId);
  const confirmationCode = first(params.confirmationCode);
  const [offer, ownsConfirmation] = await Promise.all([
    offerId ? flightService.revalidateOffer(offerId, criteria) : undefined,
    hasOwnedTravelConfirmation(confirmationCode, 'FLIGHT'),
  ]);
  if (!offer || !confirmationCode || !ownsConfirmation)
    return (
      <div className="flight-booking-page">
        <Card className="flight-booking-page__empty">
          <h1>Confirmation unavailable</h1>
          <p>Please start a new flight search.</p>
        </Card>
      </div>
    );
  const segment = offer.segments[0];
  const returnSegment = offer.segments.find((item) => item.leg === 'return');
  const itineraryQuery = { ...flightSearchCriteriaToQuery(criteria), offerId: offer.id };

  return (
    <div className="flight-confirmation-page">
      <div className="flight-confirmation-page__container">
        <div className="flight-confirmation-page__check">✓</div>
        <p className="hotel-page__eyebrow">Flight confirmed</p>
        <h1>You’re ready to fly.</h1>
        <Card className="flight-confirmation-page__card">
          <div className="flight-confirmation-page__reference">
            <span>Mandyal Travels booking reference</span>
            <strong>{confirmationCode}</strong>
          </div>
          <dl className="flight-confirmation-page__flight">
            <div>
              <dt>Airline</dt>
              <dd>{segment.airlineName}</dd>
            </div>
            <div>
              <dt>Flight</dt>
              <dd>{offer.segments.map((item) => item.flightNumber).join(' / ')}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>
                {segment.departureAirport} → {segment.arrivalAirport}
                {returnSegment
                  ? ` / ${returnSegment.departureAirport} → ${returnSegment.arrivalAirport}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt>Departure</dt>
              <dd>{criteria.departureDate}</dd>
            </div>
            {criteria.returnDate ? (
              <div>
                <dt>Return</dt>
                <dd>{criteria.returnDate}</dd>
              </div>
            ) : null}
            <div>
              <dt>Travelers</dt>
              <dd>
                {criteria.adults} adult{criteria.adults === 1 ? '' : 's'}
              </dd>
            </div>
            <div>
              <dt>Amount paid</dt>
              <FlightPaidAmount
                confirmationCode={confirmationCode}
                fallbackTotal={offer.totalPrice}
              />
            </div>
          </dl>
          <FlightConfirmationDetails
            confirmationCode={confirmationCode}
            itineraryQuery={itineraryQuery}
          />
        </Card>
      </div>
    </div>
  );
}
