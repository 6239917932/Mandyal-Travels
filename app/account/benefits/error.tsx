'use client';

import { useEffect } from 'react';

export default function CustomerBenefitsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Customer benefits page failed to load.', error);
  }, [error]);

  return (
    <section className="account-page" role="alert">
      <div className="account-trips__heading">
        <p className="hotel-page__eyebrow">Customer programme readiness</p>
        <h1>Benefits record temporarily unavailable</h1>
        <p>No balance or programme setting was changed.</p>
      </div>
      <button className="ui-button ui-button--primary" onClick={reset} type="button">
        Try again
      </button>
    </section>
  );
}
