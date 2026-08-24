'use client';

import Link from 'next/link';

import { Card } from '@/components/ui/Card';

export default function CustomerTravelHistoryError({ reset }: { reset: () => void }) {
  return (
    <section className="account-page">
      <Card className="account-trips__empty" role="alert">
        <p className="hotel-page__eyebrow">Travel history</p>
        <h1>Your travel history is temporarily unavailable</h1>
        <p>No booking, payment, refund, document, or provider state was changed.</p>
        <div className="account-trip__actions">
          <button className="ui-button ui-button--primary" onClick={reset} type="button">
            Try again
          </button>
          <Link className="ui-button ui-button--secondary" href="/account">
            Back to my account
          </Link>
        </div>
      </Card>
    </section>
  );
}
