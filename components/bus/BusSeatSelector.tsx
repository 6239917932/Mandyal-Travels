'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BusSeatSelectorProps {
  blockedSeats: string[];
  passengers: number;
  pricePerSeat: number;
  nextQuery: Record<string, string>;
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
}: BusSeatSelectorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  function toggle(seat: string) {
    setSaved(false);
    setSelected((current) => {
      if (current.includes(seat)) return current.filter((item) => item !== seat);
      if (current.length >= passengers) return current;
      return [...current, seat];
    });
  }

  function save() {
    if (saved) {
      const query = new URLSearchParams({ ...nextQuery, seats: selected.join(',') });
      router.push(`/buses/booking/passengers?${query.toString()}`);
      return;
    }
    if (selected.length !== passengers) return;
    sessionStorage.setItem('mandyal-bus-seats', JSON.stringify(selected));
    setSaved(true);
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
        disabled={selected.length !== passengers}
        onClick={save}
        type="button"
      >
        {saved ? 'Continue to passenger details' : 'Hold selected seats'}
      </button>
      {saved ? (
        <p className="flight-passenger-form__success" role="status">
          Seats held for this browser session. Passenger details are the next step.
        </p>
      ) : null}
    </div>
  );
}
