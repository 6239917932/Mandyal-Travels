import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicPageHero } from '@/components/layout/PublicPageHero';
import { FlightOfferCard } from '@/components/flight/FlightOfferCard';
import { FlightResultControls } from '@/components/flight/FlightResultControls';
import { FlightSearchForm } from '@/components/flight/FlightSearchForm';
import { applyFlightResultControls } from '@/lib/flight/offerFilters';
import { flightService } from '@/services/flightService';
import {
  createFlightSearchCriteria,
  flightSearchCriteriaToQuery,
} from '@/utils/flightSearchCriteria';
import { createFlightResultControls } from '@/utils/flightResultControls';

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
  const params = await searchParams;
  const criteria = createFlightSearchCriteria(params);
  const { error, offers: availableOffers } = await getFlightSearchResult(criteria);
  const airlines = Array.from(
    new Map(
      availableOffers.flatMap((offer) =>
        offer.segments.map((segment) => [segment.airlineCode, segment.airlineName] as const),
      ),
    ),
    ([code, name]) => ({ code, name }),
  ).sort((first, second) => first.name.localeCompare(second.name));
  const controls = createFlightResultControls(
    params,
    airlines.map(({ code }) => code),
  );
  const offers = applyFlightResultControls(availableOffers, controls);
  const unfilteredSearchQuery = flightSearchCriteriaToQuery(criteria);
  const route =
    criteria.tripType === 'multi-city'
      ? criteria.multiCitySegments
          ?.map((segment) => segment.origin)
          .concat(criteria.multiCitySegments.at(-1)?.destination ?? [])
          .join(' → ')
      : `${criteria.origin} → ${criteria.destination}`;
  return (
    <div className="flight-page">
      <PublicPageHero
        description="Compare normalized offers with clear baggage, fare rules, timings, and supplier provenance."
        eyebrow="Flights"
        title="Find your next flight."
      />
      <section className="flight-page__content">
        <div className="flight-page__container">
          <FlightSearchForm criteria={criteria} />
          <FlightResultControls airlines={airlines} controls={controls} criteria={criteria} />
          {error ? (
            <p className="flight-page__error" role="alert">
              {error}
            </p>
          ) : null}
          {!error ? (
            <>
              <div className="flight-page__heading">
                <div>
                  <p className="hotel-page__eyebrow">Available offers</p>
                  <h2>{offers.length} flights found</h2>
                </div>
                <p>
                  {route} · {criteria.adults} adult
                  {criteria.adults === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flight-offer-list">
                {offers.length ? (
                  offers.map((offer) => (
                    <FlightOfferCard criteria={criteria} key={offer.id} offer={offer} />
                  ))
                ) : availableOffers.length > 0 ? (
                  <div className="hotel-page__empty-state">
                    <p>No flights match the active filters.</p>
                    <Link
                      className="ui-button ui-button--secondary"
                      href={{ pathname: '/flights', query: unfilteredSearchQuery }}
                    >
                      Clear filters
                    </Link>
                  </div>
                ) : (
                  <p className="hotel-page__empty-state">
                    No verified flights are available for this search. Try another route or adjust
                    your dates and cabin selection.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
