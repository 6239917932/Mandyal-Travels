import type { Metadata } from 'next';

import { BusOfferCard } from '@/components/bus/BusOfferCard';
import { BusSearchForm } from '@/components/bus/BusSearchForm';
import { busService } from '@/services/busService';
import { createBusSearchCriteria } from '@/utils/busSearchCriteria';

export const metadata: Metadata = { title: 'Buses' };

export default async function BusesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const criteria = createBusSearchCriteria(await searchParams);
  let error: string | undefined;
  let offers = [] as Awaited<ReturnType<typeof busService.search>>;
  try {
    offers = await busService.search(criteria);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Bus search is unavailable.';
  }
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
          {error ? (
            <p className="flight-page__error" role="alert">
              {error}
            </p>
          ) : null}
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
            ) : (
              <p className="hotel-page__empty-state">
                No matching buses found. Try Chandigarh to Delhi or Delhi to Jaipur.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
