'use client';

import { useState, type FormEvent } from 'react';

type SubmitState = 'error' | 'idle' | 'sending' | 'success';

export function FooterNewsletterForm() {
  const [state, setState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setMessage('');
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch('/api/v1/newsletter-subscriptions', {
        body: JSON.stringify({ email: data.get('email') }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setState('error');
        setMessage(payload.error?.message ?? 'Subscription could not be saved.');
        return;
      }

      form.reset();
      setState('success');
      setMessage('You are on the list. We will only send relevant Mandyal Travels updates.');
    } catch {
      setState('error');
      setMessage('Subscription could not be saved. Please try again later.');
    }
  }

  return (
    <form className="site-footer__newsletter" onSubmit={subscribe}>
      <label htmlFor="footer-newsletter-email">Travel updates and owner opportunities</label>
      <div className="site-footer__newsletter-row">
        <input
          autoComplete="email"
          id="footer-newsletter-email"
          maxLength={254}
          name="email"
          placeholder="Your email address"
          required
          type="email"
        />
        <button disabled={state === 'sending'} type="submit">
          <span className="sr-only">Subscribe</span>
          <span aria-hidden="true">{state === 'sending' ? '…' : '✓'}</span>
        </button>
      </div>
      <small>By subscribing, you agree to receive marketing emails. Unsubscribe at any time.</small>
      <p aria-live="polite" className={state === 'error' ? 'site-footer__newsletter-error' : ''}>
        {message}
      </p>
    </form>
  );
}
