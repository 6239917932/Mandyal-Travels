import { Card } from '@/components/ui/Card';

export default function CustomerDocumentsLoading() {
  return (
    <section className="account-page" aria-busy="true" aria-live="polite">
      <header className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Private booking records</p>
          <h1>Travel documents</h1>
          <p role="status">Loading your eligible travel documents…</p>
        </div>
      </header>
      <div className="account-trips__list">
        <Card>
          <strong>Loading hotel documents…</strong>
        </Card>
        <Card>
          <strong>Loading transport documents…</strong>
        </Card>
      </div>
    </section>
  );
}
