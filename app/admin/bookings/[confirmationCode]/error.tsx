'use client';

import Link from 'next/link';

import styles from './page.module.css';

export default function AdminBookingDossierError({ retry }: { retry: () => void }) {
  return (
    <section className={`account-page admin-workspace ${styles.page}`} role="alert">
      <div className={styles.errorCard}>
        <p className="admin-hero__eyebrow">Read-only operational evidence</p>
        <h1>Booking dossier unavailable</h1>
        <p>No booking, payment, refund, inventory, document, or support record was changed.</p>
        <div className={styles.heroActions}>
          <button className="ui-button ui-button--primary" onClick={retry} type="button">
            Try again
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/bookings">
            Return to booking directory
          </Link>
        </div>
      </div>
    </section>
  );
}
