import Link from 'next/link';

import { PublicPageHero } from '@/components/layout/PublicPageHero';
import { Card } from '@/components/ui/Card';
import { siteConfig } from '@/config/site';
import { createPublicMetadata } from '@/lib/seo/siteMetadata';

const description =
  'Learn about Mandyal Travels Services Private Limited, a Himachal Pradesh travel company building transparent hotel, car and trip-planning services.';

export const metadata = createPublicMetadata({
  absoluteTitle: true,
  description,
  path: '/about',
  title: 'About Mandyal Travels Services Private Limited',
});

export default function AboutPage() {
  return (
    <div className="home-page">
      <PublicPageHero
        description="A Himachal Pradesh travel company building clearer journeys for travellers and practical operating tools for independent hospitality and vehicle partners."
        eyebrow="Our company"
        size="large"
        title="Mandyal Travels Services Private Limited"
      />

      <section className="home-section">
        <div className="home-container">
          <div className="home-section__heading home-section__heading--row">
            <div>
              <p className="home-section__eyebrow">Rooted in Himachal Pradesh</p>
              <h2 className="home-section__title">Travel technology with a local point of view.</h2>
            </div>
            <p className="home-section__description">
              Mandyal Travels is the customer-facing brand of {siteConfig.legalName}. The company
              was incorporated in India on 17 June 2026 and is developing hotel discovery, car
              rentals, guided trip planning and partner-management services.
            </p>
          </div>

          <div className="travel-options-grid">
            <Card className="travel-option">
              <span className="travel-option__number">01</span>
              <h3>For travellers</h3>
              <p>
                Understand the service, price, supplier and applicable policy before making a
                booking decision.
              </p>
            </Card>
            <Card className="travel-option">
              <span className="travel-option__number">02</span>
              <h3>For local partners</h3>
              <p>
                Give approved hotel and vehicle businesses tools for inventory, operations,
                compliance and settlement visibility.
              </p>
            </Card>
            <Card className="travel-option">
              <span className="travel-option__number">03</span>
              <h3>Responsible launch</h3>
              <p>
                Commercial bookings and public supplier listings remain controlled until payment,
                contract, compliance and supplier-verification requirements are ready.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt">
        <div className="home-container">
          <div className="home-section__heading">
            <p className="home-section__eyebrow">Business identity</p>
            <h2 className="home-section__title">Registered and reachable.</h2>
            <p className="home-section__description">
              Registered office: {siteConfig.registeredOffice.lines.join(', ')}. Customer support is
              available at {siteConfig.supportEmail} and {siteConfig.supportPhone.display}.
            </p>
          </div>
          <div className="home-cta__actions">
            <Link className="home-link-button home-link-button--primary" href="/contact">
              Contact Mandyal Travels
            </Link>
            <Link className="home-link-button home-link-button--outline" href="/legal">
              Review policies
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
