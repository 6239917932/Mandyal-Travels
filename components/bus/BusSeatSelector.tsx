'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { readJsonResponse } from '@/lib/api/clientResponse';

interface BusSeatSelectorProps {
  blockedSeats: string[];
  passengers: number;
  pricePerSeat: number;
  nextQuery: Record<string, string>;
  requiresServerHold: boolean;
}

const seats = Array.from(
  { length: 24 },
  (_, index) => `${Math.floor(index / 4) + 1}${['A', 'B', 'C', 'D'][index % 4]}`,
);
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);

export function BusSeatSelector({
  blockedSeats,
  nextQuery,
  passengers,
  pricePerSeat,
  requiresServerHold,
}: BusSeatSelectorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState('');

  function toggle(seat: string) {
    setError('');
    setSelected((current) => {
      if (current.includes(seat)) return current.filter((item) => item !== seat);
      if (current.length >= passengers) return current;
      return [...current, seat];
    });
  }

  async function save() {
    if (selected.length !== passengers) return;
    setHolding(true);
    setError('');
    let holdId: string | undefined;
    if (requiresServerHold) {
      try {
        const response = await fetch('/api/v1/buses/seat-holds', {
          body: JSON.stringify({
            offerId: nextQuery.offerId,
            seats: selected,
            serviceDate: nextQuery.travelDate,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
        const result = await readJsonResponse<{
          data?: { expiresAt: string; holdId: string; seats: string[] };
          error?: { message?: string };
        }>(response);
        if (!response.ok || !result?.data) {
          setError(
            result?.error?.message ??
              (response.status === 401
                ? 'Sign in before holding direct operator seats.'
                : 'The seats could not be held. Please try again.'),
          );
          setHolding(false);
          return;
        }
        holdId = result.data.holdId;
        sessionStorage.setItem('mandyal-bus-seat-hold', JSON.stringify(result.data));
      } catch {
        setError('The seat hold service is unavailable. Please try again.');
        setHolding(false);
        return;
      }
    }
    sessionStorage.setItem('mandyal-bus-seats', JSON.stringify(selected));
    const query = new URLSearchParams({
      ...nextQuery,
      ...(holdId ? { seatHoldId: holdId } : {}),
      seats: selected.join(','),
    });
    router.push(`/buses/booking/passengers?${query.toString()}`);
  }

  return (
    <div className="bus-seat-selector">
      <div className="bus-seat-selector__legend">
        <span>
          <i className="bus-seat bus-seat--sample" />
          Available
        </span>
        <span>
          <i className="bus-seat bus-seat--selected bus-seat--sample" />
          Selected
        </span>
        <span>
          <i className="bus-seat bus-seat--blocked bus-seat--sample" />
          Unavailable
        </span>
      </div>
      <div className="bus-seat-selector__vehicle">
        <div className="bus-seat-selector__driver">Driver</div>
        <div className="bus-seat-selector__grid">
          {seats.map((seat, index) => {
            const blocked = blockedSeats.includes(seat);
            const active = selected.includes(seat);
            return (
              <button
                aria-pressed={active}
                className={`bus-seat ${blocked ? 'bus-seat--blocked' : ''} ${active ? 'bus-seat--selected' : ''} ${index % 4 === 2 ? 'bus-seat--aisle' : ''}`}
                disabled={blocked}
                key={seat}
                onClick={() => toggle(seat)}
                type="button"
              >
                {seat}
              </button>
            );
          })}
        </div>
      </div>
      <div className="bus-seat-selector__selection">
        <div>
          <span>Selected seats</span>
          <strong>{selected.length ? selected.join(', ') : 'None'}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{money(selected.length * pricePerSeat)}</strong>
        </div>
      </div>
      {selected.length < passengers ? (
        <p className="bus-seat-selector__hint">
          Select {passengers - selected.length} more seat
          {passengers - selected.length === 1 ? '' : 's'}.
        </p>
      ) : null}
      <button
        className="ui-button ui-button--accent ui-button--full-width"
        disabled={holding || selected.length !== passengers}
        onClick={save}
        type="button"
      >
        {holding ? 'Holding seats…' : 'Hold seats and continue'}
      </button>
      {error ? (
        <p className="ui-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
