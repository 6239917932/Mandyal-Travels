import Image from 'next/image';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import type { HotelSearchCriteria, HotelSearchResult } from '@/types/hotel';

interface HotelResultCardProps {
  criteria: HotelSearchCriteria;
  eagerImage?: boolean;
  result: HotelSearchResult;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export function HotelResultCard({ criteria, eagerImage = false, result }: HotelResultCardProps) {
  const { hotel, minimumNightlyRate, nights, totalStayPrice } = result;
  const primaryImage = hotel.images.find((image) => image.isPrimary) ?? hotel.images[0];

  return (
    <Card className="hotel-result-card" padded={false}>
      <div className="hotel-result-card__image-wrapper">
        <Image
          alt={primaryImage.alt}
          className="hotel-result-card__image"
          height={420}
          loading={eagerImage ? undefined : 'lazy'}
          preload={eagerImage}
          src={primaryImage.url}
          width={640}
        />
      </div>

      <div className="hotel-result-card__content">
        <div>
          <div className="hotel-result-card__heading">
            <div>
              <p className="hotel-result-card__location">
                {hotel.location.address.locality ?? hotel.location.address.city}
                {hotel.location.address.district &&
                hotel.location.address.district !== hotel.location.address.locality
                  ? `, ${hotel.location.address.district}`
                  : ''}
              </p>
              <h2>{hotel.name}</h2>
            </div>

            <div className="hotel-result-card__rating">
              <strong>{hotel.reviewSummary.averageRating.toFixed(1)}</strong>
              <span>{hotel.reviewSummary.reviewCount} reviews</span>
            </div>
          </div>

          <p className="hotel-result-card__description">{hotel.description}</p>

          <div className="hotel-result-card__amenities">
            {hotel.amenities.slice(0, 4).map((amenity) => (
              <span key={amenity.id}>{amenity.name}</span>
            ))}
          </div>
        </div>

        <div className="hotel-result-card__price">
          <p>From</p>
          <strong>{formatCurrency(minimumNightlyRate.amount, minimumNightlyRate.currency)}</strong>
          <span>per night, before taxes</span>
          <small>
            {nights} night{nights === 1 ? '' : 's'} total:{' '}
            {formatCurrency(totalStayPrice.amount, totalStayPrice.currency)}
          </small>

          <Link
            className="hotel-result-card__details-link"
            href={{
              pathname: `/hotels/${hotel.slug}`,
              query: {
                adults: criteria.adults,
                checkInDate: criteria.checkInDate,
                checkOutDate: criteria.checkOutDate,
                children: criteria.children,
                rooms: criteria.rooms,
              },
            }}
          >
            View details
          </Link>
        </div>
      </div>
    </Card>
  );
}
