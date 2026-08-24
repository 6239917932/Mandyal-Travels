import { Card } from '@/components/ui/Card';

import styles from './page.module.css';

export default function OffersLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className={`home-page ${styles.page}`}>
      <section className="home-hero home-hero--interior">
        <div className="home-container">
          <p className="home-hero__eyebrow">Offers and promotions</p>
          <h1 className="home-hero__title">Loading governed offers…</h1>
          <p className="home-section__note">Checking current campaign availability.</p>
        </div>
      </section>
      <section className="home-section">
        <div className={`home-container ${styles.grid}`}>
          <Card className={styles.placeholder}>Loading offer details…</Card>
          <Card className={styles.placeholder}>Loading eligibility…</Card>
        </div>
      </section>
    </div>
  );
}
