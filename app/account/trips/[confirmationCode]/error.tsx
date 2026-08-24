'use client';

import Link from 'next/link';

import styles from './page.module.css';

export default function CustomerTransportTripDetailError({ retry }: { retry: () => void }) {
  return (
    <section className={styles.page}>
      <div className={styles.state} role="alert">
        <p className={styles.eyebrow}>Transport booking</p>
        <h1>Booking details are temporarily unavailable</h1>
        <p>No booking, servicing, payment, refund, or provider state was changed.</p>
        <div className={styles.actions}>
          <button className="ui-button ui-button--primary" onClick={retry} type="button">
            Try again
          </button>
          <Link className="ui-button ui-button--secondary" href="/account/trips">
            Back to travel history
          </Link>
        </div>
      </div>
    </section>
  );
}
