'use client';

export default function CustomerPaymentsError({ retry }: { retry: () => void }) {
  return (
    <section className="account-page">
      <div className="customer-payments__error" role="alert">
        <p className="hotel-page__eyebrow">Hotel payments</p>
        <h1>Payment activity is temporarily unavailable</h1>
        <p>No payment or refund state was changed. Try loading this read-only view again.</p>
        <button className="ui-button ui-button--primary" onClick={() => retry()} type="button">
          Try again
        </button>
      </div>
    </section>
  );
}
