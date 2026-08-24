import type { Metadata } from 'next';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { getCustomerOfferCatalogue } from '@/services/customerOfferCatalogueService';

import styles from './page.module.css';

export const metadata: Metadata = { title: 'Offers and deals' };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function OffersPage() {
  const catalogue = await getCustomerOfferCatalogue();

  return (
    <div className={`home-page ${styles.page}`}>
      <section className="home-hero home-hero--interior">
        <div className="home-container">
          <p className="home-hero__eyebrow">Offers and promotions</p>
          <h1 className="home-hero__title">Find governed offers for your next journey.</h1>
          <p className="home-section__note">
            Only promotions currently available under Mandyal Travels campaign controls appear here.
            Eligibility and final pricing are always rechecked during booking.
          </p>
        </div>
      </section>

      <section className="home-section">
        <div className="home-container">
          <div className="home-section__heading">
            <p className="home-section__eyebrow">Available now</p>
            <h2 className="home-section__title">Choose an eligible travel service.</h2>
          </div>

          {catalogue.offers.length > 0 ? (
            <div className={styles.grid}>
              {catalogue.offers.map((offer) => (
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
              <p>You can still compare live travel options without entering a promotion code.</p>
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
            Promotion codes do not reserve inventory or guarantee a discount. Product eligibility,
            booking value, availability, campaign status, and the final payable price are validated
            again before payment.
          </p>
        </div>
      </section>
    </div>
  );
}
