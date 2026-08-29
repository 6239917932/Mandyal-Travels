import type { Metadata } from 'next';
import Link from 'next/link';
import { CarOfferCard } from '@/components/car/CarOfferCard';
import { CarResultControls } from '@/components/car/CarResultControls';
import { CarSearchForm } from '@/components/car/CarSearchForm';
import { carService } from '@/services/carService';
import { createCarSearchCriteria } from '@/utils/carSearchCriteria';
import {
  applyCarResultControls,
  carSearchCriteriaToQuery,
  createCarResultControls,
} from '@/utils/carResultControls';
export const metadata: Metadata = { title: 'Car rentals' };

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = createCarSearchCriteria(params);
  let error: string | undefined;
  let availableOffers = [] as Awaited<ReturnType<typeof carService.search>>;
  try {
    availableOffers = await carService.search(criteria);
  } catch {
    error = 'Car search is temporarily unavailable. Please try again.';
  }
  const catalogue = {
    categories: [...new Set(availableOffers.map((offer) => offer.category))].toSorted(),
    providers: [...new Set(availableOffers.map((offer) => offer.providerName))].toSorted(),
  };
  const controls = createCarResultControls(params, catalogue);
  const offers = applyCarResultControls(availableOffers, controls);
  const unfilteredSearchQuery = carSearchCriteriaToQuery(criteria);
  return (
    <div className="car-page">
      <section className="car-page__hero">
        <div className="car-page__container">
          <p className="hotel-page__eyebrow">Car rentals</p>
          <h1>Your journey, your schedule.</h1>
          <p>
            Compare trusted rental partners, vehicle features, mileage, fuel, and cancellation
            terms.
          </p>
        </div>
      </section>
      <section className="car-page__content">
        <div className="car-page__container">
          <CarSearchForm criteria={criteria} />
          <CarResultControls catalogue={catalogue} controls={controls} criteria={criteria} />
          {error ? (
            <p className="flight-page__error" role="alert">
              {error}
            </p>
          ) : null}
          {!error ? (
            <>
              <div className="car-page__heading">
                <div>
                  <p className="hotel-page__eyebrow">Available vehicles</p>
                  <h2>{offers.length} cars found</h2>
                </div>
                <p>
                  {criteria.pickupLocation} · {criteria.pickupDate} {criteria.pickupTime} to{' '}
                  {criteria.dropoffDate} {criteria.dropoffTime}
                </p>
              </div>
              <div className="car-offer-list">
                {offers.length ? (
                  offers.map((offer) => (
                    <CarOfferCard criteria={criteria} key={offer.id} offer={offer} />
                  ))
                ) : availableOffers.length > 0 ? (
                  <div className="hotel-page__empty-state">
                    <p>No cars match the active filters.</p>
                    <Link
                      className="ui-button ui-button--secondary"
                      href={{ pathname: '/cars', query: unfilteredSearchQuery }}
                    >
                      Clear filters
                    </Link>
                  </div>
                ) : (
                  <p className="hotel-page__empty-state">
                    No verified cars are available for this search. Try another location or adjust
                    your rental dates.
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
