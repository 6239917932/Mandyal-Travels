import type { Metadata } from 'next';
import { FlightOfferCard } from '@/components/flight/FlightOfferCard';
import { FlightSearchForm } from '@/components/flight/FlightSearchForm';
import { flightService } from '@/services/flightService';
import { createFlightSearchCriteria } from '@/utils/flightSearchCriteria';

export const metadata: Metadata = { title: 'Flights' };

async function getFlightSearchResult(criteria: ReturnType<typeof createFlightSearchCriteria>) {
  try {
    return { error: undefined, offers: await flightService.search(criteria) };
  } catch (cause: unknown) {
    return {
      error: cause instanceof Error ? cause.message : 'Flight search is unavailable.',
      offers: [],
    };
  }
}

export default async function FlightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const criteria = createFlightSearchCriteria(await searchParams);
  const { error, offers } = await getFlightSearchResult(criteria);
  return (
    <div className="flight-page">
      <section className="flight-page__hero">
        <div className="flight-page__container">
          <p className="hotel-page__eyebrow">Flights</p>
          <h1>Find your next flight.</h1>
          <p>
            Compare normalized offers with clear baggage, fare rules, timings, and supplier
            provenance.
          </p>
        </div>
      </section>
      <section className="flight-page__content">
        <div className="flight-page__container">
          <FlightSearchForm criteria={criteria} />
          {error ? (
            <p className="flight-page__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flight-page__heading">
            <div>
              <p className="hotel-page__eyebrow">Available offers</p>
              <h2>{offers.length} flights found</h2>
            </div>
            <p>
              {criteria.origin} → {criteria.destination} · {criteria.adults} adult
              {criteria.adults === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flight-offer-list">
            {offers.length ? (
              offers.map((offer) => (
                <FlightOfferCard criteria={criteria} key={offer.id} offer={offer} />
              ))
            ) : (
              <p className="hotel-page__empty-state">
                No matching flights found. Try DEL to BOM or DEL to BLR in economy.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
