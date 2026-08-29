import type { Metadata } from 'next';
import Link from 'next/link';

import { BusOfferCard } from '@/components/bus/BusOfferCard';
import { BusSearchForm } from '@/components/bus/BusSearchForm';
import { BusResultControls } from '@/components/bus/BusResultControls';
import { applyBusResultControls } from '@/lib/bus/offerFilters';
import { busService } from '@/services/busService';
import { busSearchCriteriaToQuery, createBusSearchCriteria } from '@/utils/busSearchCriteria';
import {
  createBusResultControlCatalogue,
  createBusResultControls,
} from '@/utils/busResultControls';

export const metadata: Metadata = { title: 'Buses' };

export default async function BusesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = createBusSearchCriteria(params);
  let error: string | undefined;
  let availableOffers = [] as Awaited<ReturnType<typeof busService.search>>;
  try {
    availableOffers = await busService.search(criteria);
  } catch {
    error = 'Bus search is temporarily unavailable. Please try again.';
  }
  const catalogue = createBusResultControlCatalogue(availableOffers);
  const controls = createBusResultControls(params, catalogue);
  const offers = applyBusResultControls(availableOffers, controls);
  const unfilteredSearchQuery = busSearchCriteriaToQuery(criteria);
  return (
    <div className="bus-page">
      <section className="bus-page__hero">
        <div className="bus-page__container">
          <p className="hotel-page__eyebrow">Buses</p>
          <h1>Travel comfortably by road.</h1>
          <p>
            Compare trusted operators, boarding points, seat availability, amenities, and
            cancellation terms.
          </p>
        </div>
      </section>
      <section className="bus-page__content">
        <div className="bus-page__container">
          <BusSearchForm criteria={criteria} />
          <BusResultControls catalogue={catalogue} controls={controls} criteria={criteria} />
          {error ? (
            <p className="flight-page__error" role="alert">
              {error}
            </p>
          ) : null}
          {!error ? (
            <>
              <div className="bus-page__heading">
                <div>
                  <p className="hotel-page__eyebrow">Available services</p>
                  <h2>{offers.length} buses found</h2>
                </div>
                <p>
                  {criteria.origin} → {criteria.destination} · {criteria.passengers} passenger
                  {criteria.passengers === 1 ? '' : 's'}
                </p>
              </div>
              <div className="bus-offer-list">
                {offers.length ? (
                  offers.map((offer) => (
                    <BusOfferCard criteria={criteria} key={offer.id} offer={offer} />
                  ))
                ) : availableOffers.length > 0 ? (
                  <div className="hotel-page__empty-state">
                    <p>No buses match the active filters.</p>
                    <Link
                      className="ui-button ui-button--secondary"
                      href={{ pathname: '/buses', query: unfilteredSearchQuery }}
                    >
                      Clear filters
                    </Link>
                  </div>
                ) : (
                  <p className="hotel-page__empty-state">
                    No verified buses are available for this search. Try another route or adjust
                    your travel date.
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
