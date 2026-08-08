import type { Metadata } from 'next';

import { HotelResultCard } from '@/components/hotel/HotelResultCard';
import { HotelSearchForm } from '@/components/hotel/HotelSearchForm';
import { hotelService } from '@/services/hotelService';
import { createHotelSearchCriteria } from '@/utils/hotelSearchCriteria';

export const metadata: Metadata = {
  title: 'Hotels',
};

interface HotelsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HotelsPage({ searchParams }: HotelsPageProps) {
  const criteria = createHotelSearchCriteria(await searchParams);
  const results = await hotelService.searchHotels(criteria);

  return (
    <div className="hotel-page">
      <section className="hotel-page__hero">
        <div className="hotel-page__container">
          <p className="hotel-page__eyebrow">Hotel stays</p>
          <h1>Find a stay that feels right.</h1>
          <p>
            Discover verified hotels with transparent rates, room choices, and policies you can
            understand before booking.
          </p>
        </div>
      </section>

      <section className="hotel-page__content">
        <div className="hotel-page__container">
          <HotelSearchForm criteria={criteria} />

          <div className="hotel-page__results-heading">
            <div>
              <p className="hotel-page__eyebrow">Available stays</p>
              <h2>{results.length} hotels found</h2>
            </div>

            <p>
              {criteria.destination
                ? `Showing stays matching “${criteria.destination}”`
                : 'Showing all available destinations'}
            </p>
          </div>

          <div className="hotel-result-list">
            {results.length > 0 ? (
              results.map((result) => (
                <HotelResultCard criteria={criteria} key={result.hotel.id} result={result} />
              ))
            ) : (
              <p className="hotel-page__empty-state">
                No hotels match this search yet. Try Shimla or Jaipur with the current fixture
                inventory.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
