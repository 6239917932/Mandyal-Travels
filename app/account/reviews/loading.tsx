export default function CustomerReviewsLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Verified-stay feedback</p>
          <h1>Loading your stay reviews…</h1>
          <p>Your private eligibility and moderation history is being prepared.</p>
        </div>
      </div>
      <div className="account-trips__empty ui-card ui-card--padded">
        <strong>Please wait.</strong>
      </div>
    </section>
  );
}
