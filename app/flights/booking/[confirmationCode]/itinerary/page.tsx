import type { Metadata } from 'next';

import { FlightItineraryActions } from '@/components/flight/FlightItineraryActions';
import { FlightPaidAmount } from '@/components/flight/FlightPaidAmount';
import { flightService } from '@/services/flightService';
import { createFlightSearchCriteria } from '@/utils/flightSearchCriteria';

export const metadata: Metadata = { title: 'Flight itinerary' };
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function FlightItineraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ confirmationCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { confirmationCode } = await params;
  const query = await searchParams;
  const criteria = createFlightSearchCriteria(query);
  const offerId = first(query.offerId);
  const offer = offerId ? await flightService.revalidateOffer(offerId, criteria) : undefined;
  if (!offer)
    return (
      <main className="flight-itinerary">
        <h1>Itinerary unavailable</h1>
      </main>
    );
  const segment = offer.segments[0];
  return (
    <main className="flight-itinerary">
      <header>
        <div>
          <p>Mandyal Travels</p>
          <h1>Flight itinerary</h1>
        </div>
        <strong>CONFIRMED</strong>
      </header>
      <section className="flight-itinerary__reference">
        <span>Booking reference</span>
        <strong>{confirmationCode}</strong>
      </section>
      <section>
        <h2>Flight details</h2>
        <dl>
          <div>
            <dt>Airline</dt>
            <dd>{segment.airlineName}</dd>
          </div>
          <div>
            <dt>Flight</dt>
            <dd>{segment.flightNumber}</dd>
          </div>
          <div>
            <dt>Route</dt>
            <dd>
              {segment.departureAirport} → {segment.arrivalAirport}
            </dd>
          </div>
          <div>
            <dt>Departure date</dt>
            <dd>{criteria.departureDate}</dd>
          </div>
          <div>
            <dt>Cabin</dt>
            <dd>{criteria.cabinClass}</dd>
          </div>
          <div>
            <dt>Baggage</dt>
            <dd>{offer.baggage}</dd>
          </div>
          <div>
            <dt>Travelers</dt>
            <dd>{criteria.adults}</dd>
          </div>
          <div>
            <dt>Amount paid</dt>
            <FlightPaidAmount
              confirmationCode={confirmationCode}
              fallbackTotal={offer.totalPrice}
            />
          </div>
        </dl>
      </section>
      <p className="flight-itinerary__notice">
        This prototype itinerary is not valid for airport check-in. Production ticketing will
        connect to the airline supplier.
      </p>
      <FlightItineraryActions />
    </main>
  );
}
