export default function CustomerNotificationsLoading() {
  return (
    <section className="account-page" aria-busy="true" aria-live="polite">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Communication history</p>
          <h1>Loading your notifications…</h1>
          <p>Your private communication history is being prepared.</p>
        </div>
      </div>
      <div className="account-trips__empty ui-card ui-card--padded">
        <strong>Please wait.</strong>
      </div>
    </section>
  );
}
