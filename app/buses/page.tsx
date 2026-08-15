import type { Metadata } from 'next';

import { BusOfferCard } from '@/components/bus/BusOfferCard';
import { BusSearchForm } from '@/components/bus/BusSearchForm';
import { BusResultControls } from '@/components/bus/BusResultControls';
import { applyBusResultControls } from '@/lib/bus/offerFilters';
import { busService } from '@/services/busService';
import { createBusSearchCriteria } from '@/utils/busSearchCriteria';
import { createBusResultControls } from '@/utils/busResultControls';

export const metadata: Metadata = { title: 'Buses' };

export default async function BusesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = createBusSearchCriteria(params);
  const controls = createBusResultControls(params);
  let error: string | undefined;
  let offers = [] as Awaited<ReturnType<typeof busService.search>>;
  try {
    offers = await busService.search(criteria);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Bus search is unavailable.';
  }
  const operators = [...new Set(offers.map((offer) => offer.operatorName))].sort();
  const busTypes = [...new Set(offers.map((offer) => offer.busType))].sort();
  offers = applyBusResultControls(offers, controls);
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
          <BusResultControls busTypes={busTypes} controls={controls} criteria={criteria} operators={operators} />
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
