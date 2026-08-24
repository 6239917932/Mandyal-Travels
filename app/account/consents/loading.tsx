export default function CustomerConsentsLoading() {
  return (
    <section className="account-page" aria-busy="true" aria-live="polite">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Privacy evidence</p>
          <h1>Loading your consent history…</h1>
          <p>Your private account evidence is being prepared.</p>
        </div>
      </div>
      <div className="account-trips__empty ui-card ui-card--padded">
        <strong>Please wait.</strong>
      </div>
    </section>
  );
}
