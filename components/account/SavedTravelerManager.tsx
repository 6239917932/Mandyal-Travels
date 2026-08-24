'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import {
  SAVED_TRAVELER_CSRF_HEADER,
  SAVED_TRAVELER_GENDERS,
  SAVED_TRAVELER_LIMIT,
  SAVED_TRAVELER_RELATIONSHIPS,
  type SavedTravelerProfile,
} from '@/services/savedTravelerService';

type SavedTravelerManagerProps = { initialTravelers: SavedTravelerProfile[] };

function payload(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    dateOfBirth: data.get('dateOfBirth'),
    email: data.get('email'),
    firstName: data.get('firstName'),
    gender: data.get('gender'),
    label: data.get('label'),
    lastName: data.get('lastName'),
    phone: data.get('phone'),
    relationship: data.get('relationship'),
  };
}

function TravelerFields({ traveler }: { traveler?: SavedTravelerProfile }) {
  return (
    <>
      <Input
        defaultValue={traveler?.label}
        label="Profile label"
        maxLength={40}
        name="label"
        required
      />
      <div className="auth-form__row">
        <Input
          defaultValue={traveler?.firstName}
          label="First name"
          maxLength={80}
          name="firstName"
          required
        />
        <Input
          defaultValue={traveler?.lastName}
          label="Last name"
          maxLength={80}
          name="lastName"
          required
        />
      </div>
      <div className="auth-form__row">
        <Input
          defaultValue={traveler?.dateOfBirth}
          label="Date of birth (optional)"
          name="dateOfBirth"
          type="date"
        />
        <label className="ui-field">
          <span className="ui-field__label">Gender (optional)</span>
          <select className="ui-input" defaultValue={traveler?.gender ?? ''} name="gender">
            {SAVED_TRAVELER_GENDERS.map((gender) => (
              <option key={gender || 'EMPTY'} value={gender}>
                {gender ? gender.replaceAll('_', ' ') : 'Not provided'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="ui-field">
        <span className="ui-field__label">Relationship</span>
        <select
          className="ui-input"
          defaultValue={traveler?.relationship ?? 'OTHER'}
          name="relationship"
        >
          {SAVED_TRAVELER_RELATIONSHIPS.map((relationship) => (
            <option key={relationship} value={relationship}>
              {relationship}
            </option>
          ))}
        </select>
      </label>
      <div className="auth-form__row">
        <Input
          defaultValue={traveler?.email}
          label="Email (optional)"
          maxLength={254}
          name="email"
          type="email"
        />
        <Input
          defaultValue={traveler?.phone}
          label="Phone (optional)"
          maxLength={16}
          name="phone"
          type="tel"
        />
      </div>
    </>
  );
}

export function SavedTravelerManager({ initialTravelers }: SavedTravelerManagerProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingId, setPendingId] = useState('');

  async function save(event: FormEvent<HTMLFormElement>, travelerId?: string) {
    event.preventDefault();
    setError('');
    setMessage('');
    setPendingId(travelerId ?? 'NEW');
    try {
      const response = await fetch(
        travelerId ? `/api/v1/account/travelers/${travelerId}` : '/api/v1/account/travelers',
        {
          body: JSON.stringify(payload(event.currentTarget)),
          headers: { 'Content-Type': 'application/json', [SAVED_TRAVELER_CSRF_HEADER]: '1' },
          method: travelerId ? 'PATCH' : 'POST',
        },
      );
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The traveler could not be saved.');
        return;
      }
      if (!travelerId) event.currentTarget.reset();
      setMessage(travelerId ? 'Traveler updated.' : 'Traveler saved.');
      router.refresh();
    } catch {
      setError('The traveler service could not be reached. Please try again.');
    } finally {
      setPendingId('');
    }
  }

  async function remove(traveler: SavedTravelerProfile) {
    if (!window.confirm(`Delete ${traveler.label}? This cannot be undone.`)) return;
    setError('');
    setMessage('');
    setPendingId(traveler.id);
    try {
      const response = await fetch(`/api/v1/account/travelers/${traveler.id}`, {
        headers: { [SAVED_TRAVELER_CSRF_HEADER]: '1' },
        method: 'DELETE',
      });
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The traveler could not be deleted.');
        return;
      }
      setMessage('Traveler deleted.');
      router.refresh();
    } catch {
      setError('The traveler service could not be reached. Please try again.');
    } finally {
      setPendingId('');
    }
  }

  return (
    <>
      <Card className="ui-card--padded">
        <h2>Save a traveler</h2>
        <p>
          Store only basic booking details. Passport, government-ID document, driving-licence, and
          payment credentials are never accepted.
        </p>
        {initialTravelers.length >= SAVED_TRAVELER_LIMIT ? (
          <p role="status">The limit of {SAVED_TRAVELER_LIMIT} saved travelers has been reached.</p>
        ) : (
          <form className="auth-form" onSubmit={(event) => save(event)}>
            <TravelerFields />
            <button
              className="ui-button ui-button--primary"
              disabled={pendingId === 'NEW'}
              type="submit"
            >
              {pendingId === 'NEW' ? 'Saving…' : 'Save traveler'}
            </button>
          </form>
        )}
      </Card>

      {initialTravelers.length === 0 ? (
        <Card className="account-trips__empty ui-card--padded">
          <strong>No saved travelers yet.</strong>
          <p>Add a profile to fill empty booking fields faster.</p>
        </Card>
      ) : (
        <div className="account-trips__list">
          {initialTravelers.map((traveler) => (
            <Card className="ui-card--padded" key={traveler.id}>
              <form className="auth-form" onSubmit={(event) => save(event, traveler.id)}>
                <TravelerFields traveler={traveler} />
                <div className="account-trip__actions">
                  <button
                    className="ui-button ui-button--secondary"
                    disabled={pendingId === traveler.id}
                    type="submit"
                  >
                    {pendingId === traveler.id ? 'Working…' : 'Save changes'}
                  </button>
                  <button
                    className="ui-button ui-button--secondary"
                    disabled={pendingId === traveler.id}
                    onClick={() => remove(traveler)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </form>
            </Card>
          ))}
        </div>
      )}
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
    </>
  );
}
