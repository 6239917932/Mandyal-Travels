'use client';

import { useSyncExternalStore } from 'react';

interface NotificationPreferenceState {
  bookingEmail: boolean;
  marketingEmail: boolean;
  smsAlerts: boolean;
  whatsappAlerts: boolean;
}

const preferenceEvent = 'mandyal-notification-preferences-changed';
const defaultPreferences: NotificationPreferenceState = {
  bookingEmail: true,
  marketingEmail: false,
  smsAlerts: false,
  whatsappAlerts: false,
};
const defaultSnapshot = JSON.stringify(defaultPreferences);

function subscribe(callback: () => void) {
  window.addEventListener(preferenceEvent, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(preferenceEvent, callback);
    window.removeEventListener('storage', callback);
  };
}

function parsePreferences(snapshot: string): NotificationPreferenceState {
  try {
    return { ...defaultPreferences, ...(JSON.parse(snapshot) as Partial<NotificationPreferenceState>) };
  } catch {
    return defaultPreferences;
  }
}

export function NotificationPreferences({ email }: { email: string }) {
  const storageKey = `mandyal-notification-preferences:${email.toLowerCase()}`;
  const snapshot = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(storageKey) ?? defaultSnapshot,
    () => defaultSnapshot,
  );
  const preferences = parsePreferences(snapshot);

  function updatePreference(name: keyof NotificationPreferenceState, checked: boolean) {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ ...preferences, [name]: checked }),
    );
    window.dispatchEvent(new Event(preferenceEvent));
  }

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

  return (
    <section className="account-trips" aria-labelledby="notification-preferences-heading">
      <div className="account-trips__heading">
        <p className="hotel-page__eyebrow">Communication</p>
        <h2 id="notification-preferences-heading">Notification preferences</h2>
      </div>
      <div className="account-trips__list">
        {options.map((option) => (
          <label className="account-trip ui-card ui-card--padded" key={option.name}>
            <span className="account-trip__topline">
              <strong>{option.label}</strong>
              <input
                checked={preferences[option.name]}
                onChange={(event) => updatePreference(option.name, event.target.checked)}
                type="checkbox"
              />
            </span>
            <span>{option.description}</span>
          </label>
        ))}
      </div>
      <div className="account-trips__empty ui-card ui-card--padded">
        <strong>Preferences are saved automatically in this browser.</strong>
        <p>
          Email, SMS, and WhatsApp delivery remain demonstrations until approved provider
          integrations and credentials are configured.
        </p>
      </div>
    </section>
  );
}
