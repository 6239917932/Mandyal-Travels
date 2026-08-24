'use client';

import { useEffect, useRef, useState } from 'react';

import styles from '@/components/hotel/HotelDiscoveryExplanation.module.css';
import {
  HOTEL_DISCOVERY_EXPLANATION_STORAGE_KEY,
  readHotelDiscoveryExplanationPayload,
} from '@/services/hotelDiscoveryExplanationRules';

type CapturedExplanation = { key: string; text: string };

export function HotelDiscoveryExplanation({
  destination,
  requestToken,
}: {
  destination: string;
  requestToken: string;
}) {
  const [captured, setCaptured] = useState<CapturedExplanation | null>(null);
  const pending = useRef<{ key: string; raw: string | null } | null>(null);
  const key = `${destination}\u0000${requestToken}`;

  useEffect(() => {
    let cancelled = false;
    if (pending.current?.key !== key) {
      let raw: string | null = null;
      try {
        raw = window.sessionStorage.getItem(HOTEL_DISCOVERY_EXPLANATION_STORAGE_KEY);
        window.sessionStorage.removeItem(HOTEL_DISCOVERY_EXPLANATION_STORAGE_KEY);
      } catch {
        raw = null;
      }
      pending.current = { key, raw };
    }

    const raw = pending.current.raw;
    const text = raw
      ? readHotelDiscoveryExplanationPayload(raw, destination, requestToken, Date.now())
      : null;
    queueMicrotask(() => {
      if (!cancelled) setCaptured(text ? { key, text } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [destination, key, requestToken]);

  const explanation = captured?.key === key ? captured.text : null;
  if (!explanation) return null;

  return (
    <aside aria-labelledby="guided-filter-explanation-heading" className={styles.explanation}>
      <div>
        <p className={styles.eyebrow}>Guided filter explanation</p>
        <h2 id="guided-filter-explanation-heading">How your search was interpreted</h2>
        <p>{explanation}</p>
        <small>
          This explanation describes applied filters only. Inventory, availability, policies, and
          final prices always come from the hotel search and quote engines.
        </small>
      </div>
      <button
        aria-label="Dismiss guided filter explanation"
        className="ui-button ui-button--secondary"
        onClick={() => setCaptured(null)}
        type="button"
      >
        Dismiss
      </button>
    </aside>
  );
}
