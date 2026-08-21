import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { RoomSelectionButton } from '@/components/hotel/RoomSelectionButton';
import { HotelReviewForm } from '@/components/hotel/HotelReviewForm';
import { HotelLocationMap } from '@/components/hotel/HotelLocationMap';
import { hotelService } from '@/services/hotelService';
import { hotelReviewService } from '@/services/hotelReviewService';
import { createHotelSearchCriteria } from '@/utils/hotelSearchCriteria';

interface HotelDetailsPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function HotelDetailsPage({ params, searchParams }: HotelDetailsPageProps) {
  const { slug } = await params;
  const criteria = createHotelSearchCriteria(await searchParams);
  const hotel = await hotelService.getHotelBySlug(slug);

  if (!hotel) {
    notFound();
  }

  const reviewData = await hotelReviewService.getHotelReviews(slug);
  const reviewSummary =
    reviewData.summary.reviewCount > 0 ? reviewData.summary : hotel.reviewSummary;

  const primaryImage = hotel.images.find((image) => image.isPrimary) ?? hotel.images[0];

  return (
    <div className="hotel-details-page">
      <div className="hotel-details-page__container">
        <Link className="hotel-details-page__back-link" href="/hotels">
          Back to hotel search
        </Link>

        <section className="hotel-details-page__heading">
          <div>
            <p className="hotel-page__eyebrow">
              {hotel.location.address.locality ?? hotel.location.address.city}
              {hotel.location.address.district ? `, ${hotel.location.address.district}` : ''},{' '}
              {hotel.location.address.state ?? hotel.location.address.country}
            </p>
            <h1>{hotel.name}</h1>
            <p>{hotel.description}</p>
          </div>

          <div className="hotel-details-page__rating">
            <strong>{reviewSummary.averageRating.toFixed(1)}</strong>
            <span>{reviewSummary.reviewCount} guest reviews</span>
          </div>
        </section>

        <section className="hotel-gallery">
          <div className="hotel-gallery__primary">
            <Image
              alt={primaryImage.alt}
              fill
              preload
              sizes="(min-width: 1024px) 66vw, 100vw"
              src={primaryImage.url}
            />
          </div>

          <div className="hotel-gallery__secondary">
            {hotel.images.slice(1, 3).map((image) => (
              <div className="hotel-gallery__secondary-image" key={image.url}>
                <Image
                  alt={image.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  src={image.url}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="hotel-details-page__grid">
          <div className="hotel-details-page__main">
            <Card>
              <h2>About this stay</h2>
              <p className="hotel-details-page__body-copy">{hotel.description}</p>

              <div className="hotel-details-page__facts">
                <div>
                  <span>Check-in</span>
                  <strong>{hotel.checkInTime}</strong>
                </div>
                <div>
                  <span>Check-out</span>
                  <strong>{hotel.checkOutTime}</strong>
                </div>
                <div>
                  <span>Inventory</span>
                  <strong>
                    {hotel.inventory.source === 'direct' ? 'Direct partner' : 'Supplier partner'}
                  </strong>
                </div>
              </div>
            </Card>

            <HotelLocationMap
              address={hotel.location.address}
              hotelName={hotel.name}
              latitude={hotel.location.latitude}
              longitude={hotel.location.longitude}
            />

            <section className="hotel-details-page__section">
              <p className="hotel-page__eyebrow">Choose a room</p>
              <h2>Available room options</h2>

              <div className="hotel-room-list">
                {hotel.rooms.map((room) => {
                  const ratePlan = room.ratePlans[0];

                  return (
                    <Card className="hotel-room-card" key={room.roomTypeId}>
                      <div>
                        <h3>{room.name}</h3>
                        <p>{room.description}</p>
                        <p className="hotel-room-card__meta">
                          {room.bedDescription} · Up to {room.occupancy.maximumGuests} guests
                        </p>

                        <div className="hotel-result-card__amenities">
                          {room.amenities.slice(0, 4).map((amenity) => (
                            <span key={amenity.id}>{amenity.name}</span>
                          ))}
                        </div>
                      </div>

                      <div className="hotel-room-card__price">
                        <strong>
                          {formatCurrency(
                            ratePlan.nightlyRate.amount,
                            ratePlan.nightlyRate.currency,
                          )}
                        </strong>
                        <span>per night, before taxes</span>
                        <p>{ratePlan.name}</p>
                        <small>{ratePlan.cancellationPolicy.description}</small>
                        <RoomSelectionButton
                          adults={criteria.adults}
                          checkInDate={criteria.checkInDate}
                          checkOutDate={criteria.checkOutDate}
                          childGuests={criteria.children}
                          hotel={hotel}
                          ratePlan={ratePlan}
                          rooms={criteria.rooms}
                          selectedRoom={room}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            <section className="hotel-details-page__section" id="guest-reviews">
              <p className="hotel-page__eyebrow">Verified stays</p>
              <h2>Guest reviews</h2>
              {reviewData.reviews.length > 0 ? (
                <div className="hotel-review-list">
                  {reviewData.reviews.map((review) => (
                    <Card className="hotel-review" key={review.id}>
                      <div className="hotel-review__heading">
                        <div>
                          <strong>{review.title}</strong>
                          <span>{review.reviewerName} · Verified stay</span>
                        </div>
                        <strong>{review.rating.toFixed(1)}</strong>
                      </div>
                      <p>{review.body}</p>
                      {review.partnerReply ? (
                        <div className="hotel-review__partner-reply">
                          <strong>Property response</strong>
                          <p>{review.partnerReply}</p>
                        </div>
                      ) : null}
                      <time dateTime={review.createdAt}>
                        {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                          new Date(review.createdAt),
                        )}
                      </time>
                    </Card>
                  ))}
                </div>
              ) : (
                <p>No verified guest reviews have been published yet.</p>
              )}
              <HotelReviewForm hotelSlug={slug} />
            </section>
          </div>

          <aside>
            <Card className="hotel-details-page__sidebar">
              <h2>Hotel amenities</h2>
              <ul>
                {hotel.amenities.map((amenity) => (
                  <li key={amenity.id}>{amenity.name}</li>
                ))}
              </ul>

              <h2>Important policies</h2>
              <ul>
                {hotel.policies.map((policy) => (
                  <li key={policy}>{policy}</li>
                ))}
              </ul>
              {hotel.propertyProfile ? (
                <>
                  <h2>Property information</h2>
                  <dl className="hotel-property-profile">
                    <div>
                      <dt>Property type</dt>
                      <dd>
                        {hotel.propertyProfile.propertyType.replaceAll('_', ' ').toLowerCase()}
                      </dd>
                    </div>
                    <div>
                      <dt>Minimum check-in age</dt>
                      <dd>{hotel.propertyProfile.minimumCheckInAge}</dd>
                    </div>
                    <div>
                      <dt>Children</dt>
                      <dd>
                        {hotel.propertyProfile.childrenAllowed ? 'Welcome' : 'Not accommodated'}
                      </dd>
                    </div>
                    <div>
                      <dt>Pets</dt>
                      <dd>{hotel.propertyProfile.petsAllowed ? 'Allowed' : 'Not allowed'}</dd>
                    </div>
                    <div>
                      <dt>Smoking</dt>
                      <dd>
                        {hotel.propertyProfile.smokingAllowed
                          ? 'Designated areas'
                          : 'Non-smoking property'}
                      </dd>
                    </div>
                    {hotel.propertyProfile.languages.length ? (
                      <div>
                        <dt>Languages</dt>
                        <dd>{hotel.propertyProfile.languages.join(', ')}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {hotel.propertyProfile.landmarks.length ? (
                    <>
                      <h2>Nearby landmarks</h2>
                      <ul>
                        {hotel.propertyProfile.landmarks.map((landmark) => (
                          <li key={landmark}>{landmark}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </>
              ) : null}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
