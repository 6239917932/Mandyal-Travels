'use client';

export default function AdminSearchError({ reset }: { reset: () => void }) {
  return (
    <section className="account-page admin-workspace">
      <div className="account-trips__empty ui-card ui-card--padded" role="alert">
        <strong>Search health could not be loaded.</strong>
        <p>No projection or inventory data was changed. Try loading the protected view again.</p>
        <button className="ui-button ui-button--secondary" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </section>
  );
}
