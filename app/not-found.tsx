import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Page not found</p>
        <h1>This travel page does not exist.</h1>
        <p>The link may be incomplete, expired, or no longer available.</p>
      </div>
      <div className="manage-booking__document-actions">
        <Link className="ui-button ui-button--primary" href="/">
          Return home
        </Link>
        <Link className="ui-button ui-button--secondary" href="/manage-booking">
          Manage a booking
        </Link>
      </div>
    </section>
  );
}
