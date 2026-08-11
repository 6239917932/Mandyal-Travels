'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('Portal page rendering failed.', error);
  }, [error]);

  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Temporary problem</p>
        <h1>We could not open this page.</h1>
        <p>Your booking and account information have not been changed.</p>
        {error.digest ? <p>Support reference: {error.digest}</p> : null}
      </div>
      <div className="manage-booking__document-actions">
        <button className="ui-button ui-button--primary" onClick={() => retry()} type="button">
          Try again
        </button>
        <Link className="ui-button ui-button--secondary" href="/">
          Return home
        </Link>
      </div>
    </section>
  );
}
