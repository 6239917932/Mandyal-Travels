'use client';

import styles from './page.module.css';

export default function HotelBookingDetailError({ retry }: { retry: () => void }) {
  return (
    <section className={styles.page}>
      <div className={styles.state} role="alert">
        <p className={styles.eyebrow}>Hotel booking</p>
        <h1>Booking details are temporarily unavailable</h1>
        <p>No booking or servicing state was changed. Try loading this read-only view again.</p>
        <button className="ui-button ui-button--primary" onClick={() => retry()} type="button">
          Try again
        </button>
      </div>
    </section>
  );
}
