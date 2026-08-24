export default function SavedTravelersLoading() {
  return (
    <section className="account-page" aria-busy="true" aria-live="polite">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Faster checkout</p>
          <h1>Loading saved travelers…</h1>
        </div>
      </div>
      <div className="account-trips__empty ui-card ui-card--padded">
        <strong>Your private profiles are being prepared.</strong>
      </div>
    </section>
  );
}
