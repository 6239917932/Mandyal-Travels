'use client';

export default function CustomerReviewsError({ reset }: { reset: () => void }) {
  return (
    <section className="account-page" role="alert">
      <div className="account-trips__empty ui-card ui-card--padded">
        <strong>Your stay-review center could not be loaded.</strong>
        <p>No review, booking, payment, refund, or inventory record was changed.</p>
        <button className="ui-button ui-button--secondary" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </section>
  );
}
