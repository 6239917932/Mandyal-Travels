'use client';

import Link from 'next/link';

import styles from './page.module.css';

export default function OffersError({ retry }: { retry: () => void }) {
  return (
    <section className={`home-section ${styles.error}`} role="alert">
      <div className="home-container">
        <p className="home-section__eyebrow">Offers unavailable</p>
        <h1>We could not check current promotions.</h1>
        <p>No discount claim can be shown until campaign availability is confirmed.</p>
        <div className={styles.actions}>
          <button className="ui-button ui-button--primary" onClick={retry} type="button">
            Try again
          </button>
          <Link className="ui-button ui-button--secondary" href="/">
            Return home
          </Link>
        </div>
      </div>
    </section>
  );
}
