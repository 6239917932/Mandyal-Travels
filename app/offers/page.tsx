import type { Metadata } from 'next';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';

export const metadata: Metadata = { title: 'Offers and deals' };

const offers = [
  {
    code: 'STAYMORE',
    title: 'Hotel stay savings',
    description: 'Use STAYMORE for 12% off eligible hotel bookings of ₹8,000 or more, up to ₹1,500.',
    href: '/hotels',
    action: 'Search hotels',
  },
  {
    code: 'FLYSMART',
    title: 'Flight booking offers',
    description: 'Use FLYSMART for 10% off eligible flight bookings of ₹4,000 or more, up to ₹1,000.',
    href: '/flights',
    action: 'Search flights',
  },
  {
    code: 'ROADTRIP',
    title: 'Bus travel savings',
    description: 'Use ROADTRIP for 8% off eligible bus bookings of ₹1,000 or more, up to ₹400.',
    href: '/buses',
    action: 'Explore buses',
  },
  {
    code: 'ROADTRIP',
    title: 'Car rental savings',
    description: 'Use ROADTRIP for 8% off eligible car rentals of ₹1,000 or more, up to ₹400.',
    href: '/cars',
    action: 'Explore cars',
  },
] as const;

export default function OffersPage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-container">
          <p className="home-hero__eyebrow">Offers and promotions</p>
          <h1 className="home-hero__title">Find more value for your next journey.</h1>
          <p className="home-hero__description">
            Browse Mandyal Travels promotional previews across hotels, flights, buses, and cars.
            Eligibility and final pricing are confirmed during booking.
          </p>
        </div>
      </section>

      <section className="home-section">
        <div className="home-container">
          <div className="home-section__heading">
            <p className="home-section__eyebrow">Current offer previews</p>
            <h2 className="home-section__title">Choose a travel service to continue.</h2>
          </div>
          <div className="travel-options-grid">
            {offers.map((offer, index) => (
              <Card className="travel-option" key={`${offer.code}-${offer.href}`}>
                <span className="travel-option__number">0{index + 1}</span>
                <p className="home-section__eyebrow">{offer.code}</p>
                <h3>{offer.title}</h3>
                <p>{offer.description}</p>
                <Link className="home-link-button home-link-button--primary" href={offer.href}>
                  {offer.action}
                </Link>
              </Card>
            ))}
          </div>
          <p className="home-hero__description">
            FLYSMART, STAYMORE, and ROADTRIP are validated during their respective checkout flows.
            All promotions are demonstrations.
          </p>
        </div>
      </section>
    </div>
  );
}
