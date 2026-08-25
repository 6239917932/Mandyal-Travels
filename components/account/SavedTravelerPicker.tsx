'use client';

import Link from 'next/link';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import type { SavedTravelerProfile } from '@/services/savedTravelerService';

type SavedTravelerPickerProps = {
  onApply: (traveler: SavedTravelerProfile) => number;
  targetLabel: string;
};

export function SavedTravelerPicker({ onApply, targetLabel }: SavedTravelerPickerProps) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [travelers, setTravelers] = useState<SavedTravelerProfile[]>([]);

  async function openPicker() {
    setIsOpen(true);
    setMessage('');
    if (travelers.length || isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/v1/account/travelers', { cache: 'no-store' });
      const result =
        (await readJsonResponse<{ data?: SavedTravelerProfile[]; error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(
          response.status === 401
            ? 'Sign in to use saved travelers.'
            : (result.error ?? 'Saved travelers could not be loaded.'),
        );
        return;
      }
      const profiles = result.data ?? [];
      setTravelers(profiles);
      setSelectedId(profiles[0]?.id ?? '');
    } catch {
      setError('Saved travelers could not be loaded. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function apply() {
    const traveler = travelers.find((item) => item.id === selectedId);
    if (!traveler) return;
    const changed = onApply(traveler);
    setMessage(
      changed > 0
        ? `${changed} empty ${changed === 1 ? 'field was' : 'fields were'} filled.`
        : 'Existing entries were kept; no empty fields were available.',
    );
  }

  if (!isOpen) {
    return (
      <button className="ui-button ui-button--secondary" onClick={openPicker} type="button">
        Use a saved traveler
      </button>
    );
  }

  return (
    <div className="business-request__guidance">
      <strong>Fill empty fields for {targetLabel}</strong>
      {isLoading ? <p role="status">Loading saved travelers…</p> : null}
      {error ? (
        <p role="alert">
          {error} <Link href="/account/travelers">Manage travelers</Link>
        </p>
      ) : null}
      {!isLoading && !error && travelers.length === 0 ? (
        <p>
          No profiles saved. <Link href="/account/travelers">Save a traveler</Link>
        </p>
      ) : null}
      {travelers.length > 0 ? (
        <>
          <label className="ui-field">
            <span className="ui-field__label">Saved traveler</span>
            <select
              className="ui-input"
              onChange={(event) => setSelectedId(event.target.value)}
              value={selectedId}
            >
              {travelers.map((traveler) => (
                <option key={traveler.id} value={traveler.id}>
                  {traveler.label} — {traveler.firstName} {traveler.lastName}
                </option>
              ))}
            </select>
          </label>
          <button className="ui-button ui-button--secondary" onClick={apply} type="button">
            Fill empty fields
          </button>
          <p>
            Existing entries are never replaced. Identification, licence, payment, and special
            request fields are never stored or filled.
          </p>
        </>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
