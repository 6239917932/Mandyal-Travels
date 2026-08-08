import type { Metadata } from 'next';
import { CarOfferCard } from '@/components/car/CarOfferCard';
import { CarSearchForm } from '@/components/car/CarSearchForm';
import { carService } from '@/services/carService';
import { createCarSearchCriteria } from '@/utils/carSearchCriteria';
export const metadata: Metadata = { title: 'Car rentals' };

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const criteria = createCarSearchCriteria(await searchParams);
  let error: string | undefined;
  let offers = [] as Awaited<ReturnType<typeof carService.search>>;
  try {
    offers = await carService.search(criteria);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Car search is unavailable.';
  }
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
          {error ? (
            <p className="flight-page__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="car-page__heading">
            <div>
              <p className="hotel-page__eyebrow">Available vehicles</p>
              <h2>{offers.length} cars found</h2>
            </div>
            <p>
              {criteria.pickupLocation} · {criteria.pickupDate} to {criteria.dropoffDate}
            </p>
          </div>
          <div className="car-offer-list">
            {offers.length ? (
              offers.map((offer) => (
                <CarOfferCard criteria={criteria} key={offer.id} offer={offer} />
              ))
            ) : (
              <p className="hotel-page__empty-state">
                No matching cars found. Try Delhi to Delhi or Chandigarh to Chandigarh.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
