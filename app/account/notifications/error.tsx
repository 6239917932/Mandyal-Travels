'use client';

export default function CustomerNotificationsError({ reset }: { reset: () => void }) {
  return (
    <section className="account-page" role="alert">
      <div className="account-trips__empty ui-card ui-card--padded">
        <strong>Your notification history could not be loaded.</strong>
        <p>No communication, booking, payment, or account record was changed.</p>
        <button className="ui-button ui-button--secondary" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </section>
  );
}
