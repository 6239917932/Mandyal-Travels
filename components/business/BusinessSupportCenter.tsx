'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';

type BusinessSupportCase = {
  bookingReference: string | null;
  caseNumber: string;
  category: string;
  createdAt: string;
  createdByName: string;
  id: string;
  message: string;
  status: string;
  subject: string;
};

export function BusinessSupportCenter({ cases }: { cases: BusinessSupportCase[] }) {
  const router = useRouter();
  const [closingId, setClosingId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/business/support', {
        body: JSON.stringify({
          bookingReference: data.get('bookingReference'),
          category: data.get('category'),
          message: data.get('message'),
          subject: data.get('subject'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result =
        (await readJsonResponse<{ data?: { caseNumber?: string }; error?: string }>(response)) ??
        {};
      if (!response.ok) {
        setError(result.error ?? 'The support case could not be created.');
        return;
      }

      form.reset();
      setMessage(
        result.data?.caseNumber
          ? `Support case ${result.data.caseNumber} created successfully.`
          : 'Support case created successfully.',
      );
      router.refresh();
    } catch {
      setError('The support service could not be reached. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function closeCase(caseId: string) {
    setClosingId(caseId);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/v1/business/support/${encodeURIComponent(caseId)}`, {
        body: JSON.stringify({ action: 'CLOSE' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The support case could not be closed.');
        return;
      }

      setMessage('Support case closed successfully.');
      router.refresh();
    } catch {
      setError('The support service could not be reached. Please try again.');
    } finally {
      setClosingId('');
    }
  }

  return (
    <div className="business-support">
      <Card>
        <form className="business-policy" onSubmit={createCase}>
          <div className="auth-form__row">
            <div className="ui-field">
              <label className="ui-field__label" htmlFor="support-category">
                Category
              </label>
              <select
                className="ui-input"
                defaultValue="BOOKING"
                id="support-category"
                name="category"
              >
                <option value="BOOKING">Booking</option>
                <option value="BILLING">Billing or statement</option>
                <option value="ACCOUNT">Account or access</option>
                <option value="TECHNICAL">Technical issue</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <Input
              label="Booking reference (optional)"
              maxLength={40}
              name="bookingReference"
              placeholder="MT12345678"
            />
          </div>
          <Input label="Subject" maxLength={120} minLength={5} name="subject" required />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="support-message">
              Details
            </label>
            <textarea
              className="ui-input business-support__message-input"
              id="support-message"
              maxLength={2000}
              minLength={10}
              name="message"
              required
            />
          </div>
          <Button isLoading={isSubmitting} type="submit" variant="primary">
            Create support case
          </Button>
          {message ? (
            <p className="business-policy__success" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </Card>

      <div className="business-support__cases" aria-live="polite">
        {cases.map((supportCase) => (
          <Card key={supportCase.id}>
            <div className="business-support__heading">
              <div>
                <span>{supportCase.category.toLowerCase().replaceAll('_', ' ')}</span>
                <strong>{supportCase.subject}</strong>
              </div>
              <div>
                <strong>{supportCase.caseNumber}</strong>
                <span
                  className={`business-request__status business-request__status--${supportCase.status.toLowerCase()}`}
                >
                  {supportCase.status.toLowerCase()}
                </span>
              </div>
            </div>
            <p className="business-support__message">{supportCase.message}</p>
            <div className="business-support__meta">
              <span>Created by {supportCase.createdByName}</span>
              <time dateTime={supportCase.createdAt}>
                {new Date(supportCase.createdAt).toLocaleString('en-IN')}
              </time>
              {supportCase.bookingReference ? (
                <span>Booking reference: {supportCase.bookingReference}</span>
              ) : null}
            </div>
            {supportCase.status === 'OPEN' ? (
              <Button
                isLoading={closingId === supportCase.id}
                onClick={() => closeCase(supportCase.id)}
                variant="secondary"
              >
                Close case
              </Button>
            ) : null}
          </Card>
        ))}
        {cases.length === 0 ? (
          <Card>
            <strong>No support cases yet.</strong>
            <p>New organization support requests will appear here.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
