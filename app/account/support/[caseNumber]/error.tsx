'use client';

import Link from 'next/link';

import styles from './page.module.css';

export default function CustomerSupportCaseDetailError({ reset }: { reset: () => void }) {
  return (
    <section className={`account-page ${styles.page}`}>
      <div className={`${styles.error} ui-card ui-card--padded`} role="alert">
        <p className="hotel-page__eyebrow">Temporary problem</p>
        <h1>We could not load this support case.</h1>
        <p>Your support case and booking have not been changed.</p>
        <div className={styles.actions}>
          <button className="ui-button ui-button--primary" onClick={reset} type="button">
            Try again
          </button>
          <Link className="ui-button ui-button--secondary" href="/account/support">
            Back to customer support
          </Link>
        </div>
      </div>
    </section>
  );
}
