'use client';

import { useState, type FormEvent } from 'react';

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success'; reference: string }
  | { kind: 'error'; message: string };

export function ContactInquiryForm() {
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: 'sending' });
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch('/api/v1/contact-inquiries', {
        body: JSON.stringify({
          category: data.get('category'),
          email: data.get('email'),
          message: data.get('message'),
          name: data.get('name'),
          phone: data.get('phone'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const payload = (await response.json()) as {
        data?: { reference?: string };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data?.reference) {
        setState({
          kind: 'error',
          message: payload.error?.message ?? 'Your message could not be sent. Please try again.',
        });
        return;
      }

      form.reset();
      setState({ kind: 'success', reference: payload.data.reference });
    } catch {
      setState({
        kind: 'error',
        message: 'Your message could not be sent. Please call or email our team.',
      });
    }
  }

  return (
    <form className="contact-inquiry" onSubmit={submitInquiry}>
      <div className="contact-inquiry__heading">
        <p className="home-section__eyebrow">Send us a message</p>
        <h2>Tell us how we can help.</h2>
        <p>Hotel and car owners can also use this form to request partner onboarding.</p>
      </div>

      <div className="contact-inquiry__grid">
        <label>
          <span>Your name</span>
          <input autoComplete="name" maxLength={100} name="name" required />
        </label>
        <label>
          <span>Email address</span>
          <input autoComplete="email" maxLength={254} name="email" required type="email" />
        </label>
        <label>
          <span>Phone number (optional)</span>
          <input autoComplete="tel" maxLength={30} name="phone" type="tel" />
        </label>
        <label>
          <span>How can we help?</span>
          <select defaultValue="GENERAL" name="category" required>
            <option value="GENERAL">General question</option>
            <option value="HOTEL_OWNER">List or manage a hotel</option>
            <option value="CAR_OWNER">List or manage cars</option>
            <option value="BOOKING_HELP">Existing booking help</option>
          </select>
        </label>
        <label className="contact-inquiry__message">
          <span>Message</span>
          <textarea maxLength={2000} minLength={10} name="message" required rows={6} />
        </label>
      </div>

      <div className="contact-inquiry__submit">
        <button className="ui-button ui-button--primary" disabled={state.kind === 'sending'}>
          {state.kind === 'sending' ? 'Sending…' : 'Send message'}
        </button>
        <small>Never include card details, passwords, or one-time codes.</small>
      </div>

      <div aria-live="polite">
        {state.kind === 'success' ? (
          <p className="contact-inquiry__status contact-inquiry__status--success">
            Message received. Your reference is <strong>{state.reference}</strong>.
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <p className="contact-inquiry__status contact-inquiry__status--error">{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
