'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

export function RazorpayCheckout(props: {
  amount: number;
  currency: string;
  keyId: string;
  orderId: string;
  returnUrl: string;
}) {
  const opened = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      if (!window.Razorpay || opened.current) return;
      opened.current = true;
      const checkout = new window.Razorpay({
        amount: props.amount * 100,
        currency: props.currency,
        key: props.keyId,
        name: 'Mandyal Travels',
        order_id: props.orderId,
        retry: { enabled: true, max_count: 2 },
        handler: async (result: unknown) => {
          const response = await fetch('/api/v1/payments/razorpay/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
          });
          if (response.ok) window.location.assign(props.returnUrl);
          else setError('Payment could not be verified. No booking was confirmed.');
        },
        modal: { ondismiss: () => setError('Payment window closed. You can safely try again.') },
      });
      checkout.open();
    };
    script.onerror = () => setError('Secure payment could not be loaded. Please try again.');
    document.head.appendChild(script);
    return () => script.remove();
  }, [props]);

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <div className="booking-page__empty-state">
          <p className="hotel-page__eyebrow">Secure Razorpay checkout</p>
          <h1>Complete your payment</h1>
          <p>
            Your card, UPI, or banking details are entered only in Razorpay&apos;s secure window.
          </p>
          {error ? <p role="alert">{error}</p> : <p>Opening secure payment…</p>}
          <button
            className="ui-button ui-button--primary"
            onClick={() => window.location.reload()}
            type="button"
          >
            Open payment again
          </button>
        </div>
      </div>
    </main>
  );
}
