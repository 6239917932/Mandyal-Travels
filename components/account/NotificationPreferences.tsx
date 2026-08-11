'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';

export type NotificationPreferenceState = {
  bookingEmail: boolean;
  marketingEmail: boolean;
  smsAlerts: boolean;
  whatsappAlerts: boolean;
};

type NotificationPreferencesProps = {
  initialPreferences: NotificationPreferenceState;
};

export function NotificationPreferences({ initialPreferences }: NotificationPreferencesProps) {
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [preferences, setPreferences] = useState(initialPreferences);

  const options: Array<{
    description: string;
    label: string;
    name: keyof NotificationPreferenceState;
  }> = [
    {
      description: 'Booking confirmations and important itinerary changes by email.',
      label: 'Booking emails',
      name: 'bookingEmail',
    },
    {
      description: 'Time-sensitive departure and service alerts by SMS.',
      label: 'SMS travel alerts',
      name: 'smsAlerts',
    },
    {
      description: 'Booking and journey updates through WhatsApp when available.',
      label: 'WhatsApp updates',
      name: 'whatsappAlerts',
    },
    {
      description: 'Occasional Mandyal Travels offers and promotional news by email.',
      label: 'Offers and promotions',
      name: 'marketingEmail',
    },
  ];

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/v1/account/notifications', {
        body: JSON.stringify(preferences),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'Notification preferences could not be saved.');
        return;
      }
      setMessage('Notification preferences saved to your account.');
    } catch {
      setError('The account service could not be reached. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="account-trips" aria-labelledby="notification-preferences-heading">
      <div className="account-trips__heading">
        <p className="hotel-page__eyebrow">Communication</p>
        <h2 id="notification-preferences-heading">Notification preferences</h2>
      </div>
      <form className="account-trips__list" onSubmit={savePreferences}>
        {options.map((option) => (
          <label className="account-trip ui-card ui-card--padded" key={option.name}>
            <span className="account-trip__topline">
              <strong>{option.label}</strong>
              <input
                checked={preferences[option.name]}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    [option.name]: event.target.checked,
                  }))
                }
                type="checkbox"
              />
            </span>
            <span>{option.description}</span>
          </label>
        ))}
        <Button isLoading={isSaving} type="submit" variant="secondary">
          Save notification preferences
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
      <div className="account-trips__empty ui-card ui-card--padded">
        <strong>Preferences are saved to your account.</strong>
        <p>
          Email, SMS, and WhatsApp delivery remain inactive until approved provider integrations and
          credentials are configured.
        </p>
      </div>
    </section>
  );
}
