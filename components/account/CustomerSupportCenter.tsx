'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { CustomerSupportPrefill } from '@/services/customerTripServicingService';

type CustomerSupportCase = {
  bookingReference: string | null;
  caseNumber: string;
  category: string;
  createdAt: string;
  id: string;
  message: string;
  resolutionNote: string | null;
  status: string;
  subject: string;
  updatedAt: string;
};

export function CustomerSupportCenter({
  cases,
  initialRequest,
}: {
  cases: CustomerSupportCase[];
  initialRequest: CustomerSupportPrefill;
}) {
  const router = useRouter();
  const [bookingReference, setBookingReference] = useState(initialRequest.bookingReference);
  const [category, setCategory] = useState(initialRequest.category);
  const [details, setDetails] = useState(initialRequest.message);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState(initialRequest.subject);

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/account/support', {
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

      setBookingReference('');
      setCategory('BOOKING');
      setDetails('');
      setSubject('');
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

  return (
    <div className="business-support">
      <Card>
        <form className="business-policy" onSubmit={createCase}>
          <div className="auth-form__row">
            <div className="ui-field">
              <label className="ui-field__label" htmlFor="customer-support-category">
                Category
              </label>
              <select
                className="ui-input"
                id="customer-support-category"
                name="category"
                onChange={(event) => setCategory(event.target.value)}
                value={category}
              >
                <option value="BOOKING">Booking</option>
                <option value="PAYMENT">Payment</option>
                <option value="ACCOUNT">Account or access</option>
                <option value="TECHNICAL">Technical issue</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <Input
              label="Booking reference (optional)"
              maxLength={40}
              name="bookingReference"
              onChange={(event) => setBookingReference(event.target.value)}
              placeholder="MT12345678"
              value={bookingReference}
            />
          </div>
          <Input
            label="Subject"
            maxLength={120}
            minLength={5}
            name="subject"
            onChange={(event) => setSubject(event.target.value)}
            required
            value={subject}
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="customer-support-message">
              Details
            </label>
            <textarea
              className="ui-input business-support__message-input"
              id="customer-support-message"
              maxLength={2000}
              minLength={10}
              name="message"
              onChange={(event) => setDetails(event.target.value)}
              required
              value={details}
            />
          </div>
          {initialRequest.bookingReference ? (
            <p className="booking-confirmation__fine-print">
              Submitting creates a human-reviewed request. It does not automatically change or
              cancel the booking and does not guarantee a refund.
            </p>
          ) : null}
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
            {supportCase.resolutionNote ? (
              <div className="booking-confirmation__note">
                <strong>Resolution</strong>
                <p>{supportCase.resolutionNote}</p>
              </div>
            ) : null}
            <div className="business-support__meta">
              <time dateTime={supportCase.createdAt}>
                Created {new Date(supportCase.createdAt).toLocaleString('en-IN')}
              </time>
              <time dateTime={supportCase.updatedAt}>
                Updated {new Date(supportCase.updatedAt).toLocaleString('en-IN')}
              </time>
              {supportCase.bookingReference ? (
                <span>Booking reference: {supportCase.bookingReference}</span>
              ) : null}
            </div>
          </Card>
        ))}
        {cases.length === 0 ? (
          <Card>
            <strong>No support cases in this view.</strong>
            <p>Create a case above when you need help from Mandyal Travels.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
