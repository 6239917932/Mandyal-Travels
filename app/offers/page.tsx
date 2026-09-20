import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { PublicPageHero } from '@/components/layout/PublicPageHero';
import { getCustomerOfferCatalogue } from '@/services/customerOfferCatalogueService';
import { createPublicMetadata } from '@/lib/seo/siteMetadata';

import styles from './page.module.css';

export const metadata = createPublicMetadata({
  description:
    'Review current governed hotel offers from Mandyal Travels, subject to final booking eligibility and availability.',
  path: '/offers',
  title: 'Travel Offers and Deals',
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function OffersPage() {
  const catalogue = await getCustomerOfferCatalogue();
  const hotelOffers = catalogue.offers
    .map((offer) => ({
      ...offer,
      products: offer.products.filter((product) => product.product === 'HOTEL'),
    }))
    .filter((offer) => offer.products.length > 0);

  return (
    <div className={`home-page ${styles.page}`}>
      <PublicPageHero
        description="Only eligible hotel promotions currently available under Mandyal Travels campaign controls appear here; final pricing is always rechecked during booking."
        eyebrow="Hotel offers and promotions"
        imageAlt="A refined Himalayan hotel room prepared for a guest"
        imageSrc="/marketing/offers-hero-v1.png"
        title="A better hotel stay, with a clear offer."
      />

      <section className="home-section">
        <div className="home-container">
          <div className="home-section__heading">
            <p className="home-section__eyebrow">Available now</p>
            <h2 className="home-section__title">Choose an eligible hotel offer.</h2>
          </div>

          {hotelOffers.length > 0 ? (
            <div className={styles.grid}>
              {hotelOffers.map((offer) => (
                <Card className={styles.offer} key={offer.code}>
                  <div className={styles.offerHeading}>
                    <span className={styles.code}>{offer.code}</span>
                    <span>{offer.products.map((product) => product.label).join(' · ')}</span>
                  </div>
                  <h3>{offer.title}</h3>
                  {offer.description ? <p>{offer.description}</p> : null}
                  <dl className={styles.facts}>
                    <div>
                      <dt>Discount</dt>
                      <dd>{offer.percentOff}%</dd>
                    </div>
                    <div>
                      <dt>Minimum booking value</dt>
                      <dd>{formatCurrency(offer.minimumSubtotal)}</dd>
                    </div>
                    <div>
                      <dt>Maximum discount</dt>
                      <dd>{formatCurrency(offer.maximumDiscount)}</dd>
                    </div>
                  </dl>
                  <div className={styles.actions}>
                    {offer.products.map((product) => (
                      <Link
                        className="home-link-button home-link-button--primary"
                        href={product.href}
                        key={product.product}
                      >
                        {product.action}
                      </Link>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className={styles.empty}>
              <h3>No governed offers are available right now.</h3>
              <p>You can still compare available hotel stays without entering a promotion code.</p>
              <Link className="home-link-button home-link-button--primary" href="/hotels">
                Search hotels
              </Link>
            </Card>
          )}

          {catalogue.catalogueTruncated ? (
            <p className={styles.notice} role="status">
              This view evaluates the first 100 governed campaign records. Checkout remains the
              final source for promotion eligibility.
            </p>
          ) : null}
          <p className={styles.notice} role="note">
            Promotion codes do not reserve rooms or guarantee a discount. Hotel eligibility, stay
            value, availability, campaign status, and the final payable price are validated again
            before payment.
          </p>
        </div>
      </section>
    </div>
  );
}
