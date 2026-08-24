'use client';

export default function CustomerDocumentsError({ reset }: { reset: () => void }) {
  return (
    <section className="account-page" aria-labelledby="document-error-heading">
      <div className="booking-page__payment-error" role="alert">
        <h1 id="document-error-heading">Travel documents are temporarily unavailable</h1>
        <p>Your booking records were not changed. Please try loading this page again.</p>
        <button className="ui-button ui-button--primary" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </section>
  );
}
