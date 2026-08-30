import Link from 'next/link';

import { PublicPageHero } from '@/components/layout/PublicPageHero';
import { Card } from '@/components/ui/Card';

export function MarketplaceComingSoon({ product }: { product: 'Buses' | 'Flights' }) {
  const lowerProduct = product.toLowerCase();

  return (
    <div className="marketplace-coming-soon">
      <PublicPageHero
        actions={
          <>
            <Link className="home-link-button home-link-button--primary" href="/hotels">
              Search hotels
            </Link>
            <Link className="home-link-button home-link-button--glass" href="/contact">
              Ask to be notified
            </Link>
          </>
        }
        description={`Live ${lowerProduct} will open after a verified supplier API is connected, tested, and approved for customer use.`}
        eyebrow={`${product} marketplace`}
        title={`${product} are coming soon.`}
      />

      <section className="coming-soon-page">
        <Card className="coming-soon-page__card" elevated>
          <p className="hotel-page__eyebrow">Honest launch status</p>
          <h2>We will not present demonstration inventory as live availability.</h2>
          <p>
            Mandyal Travels is launching hotel property management and car fleet management first.
            Your existing account and booking records remain available while this marketplace is
            prepared.
          </p>
          <div className="home-hero__actions">
            <Link className="ui-button ui-button--primary" href="/partners">
              List a hotel or car
            </Link>
            <Link className="ui-button ui-button--secondary" href="/manage-booking">
              Manage an existing booking
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
