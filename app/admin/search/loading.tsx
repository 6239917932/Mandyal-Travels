export default function AdminSearchLoading() {
  return (
    <section className="account-page admin-workspace" aria-busy="true" aria-live="polite">
      <div className="account-trips__empty ui-card ui-card--padded">
        <strong>Loading governed search health…</strong>
        <p>Comparing published hotel sources with disposable search projections.</p>
      </div>
    </section>
  );
}
