'use client';

export default function SavedTravelersError({ reset }: { reset: () => void }) {
  return (
    <section className="account-page">
      <div className="account-trips__empty ui-card ui-card--padded" role="alert">
        <strong>Saved travelers could not be loaded.</strong>
        <p>Your existing profiles were not changed.</p>
        <button className="ui-button ui-button--secondary" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </section>
  );
}
