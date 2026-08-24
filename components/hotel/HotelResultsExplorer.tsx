'use client';

import { useState, type FocusEvent, type MouseEvent, type ReactNode } from 'react';

import { HotelResultsLocationPlot } from '@/components/hotel/HotelResultsLocationPlot';
import type { HotelResultsLocationMarker } from '@/utils/hotelResultsLocation';

interface HotelResultsExplorerProps {
  children: ReactNode;
  markers: HotelResultsLocationMarker[];
}

function readHotelKey(target: EventTarget | null): string | null {
  return target instanceof Element
    ? (target.closest<HTMLElement>('[data-hotel-key]')?.dataset.hotelKey ?? null)
    : null;
}

export function HotelResultsExplorer({ children, markers }: HotelResultsExplorerProps) {
  const [selectedHotelKey, setSelectedHotelKey] = useState<string | null>(
    markers[0]?.hotelKey ?? null,
  );

  function selectHotel(hotelKey: string) {
    setSelectedHotelKey(hotelKey);
    window.requestAnimationFrame(() => {
      document.getElementById(`hotel-result-${hotelKey}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }

  function trackFocusedCard(event: FocusEvent<HTMLDivElement>) {
    const hotelKey = readHotelKey(event.target);
    if (hotelKey) setSelectedHotelKey(hotelKey);
  }

  function trackHoveredCard(event: MouseEvent<HTMLDivElement>) {
    const hotelKey = readHotelKey(event.target);
    if (hotelKey) setSelectedHotelKey(hotelKey);
  }

  return (
    <div className="hotel-results-explorer">
      {markers.length > 0 ? (
        <HotelResultsLocationPlot
          markers={markers}
          onSelect={selectHotel}
          selectedHotelKey={selectedHotelKey}
        />
      ) : null}

      <div
        className="hotel-result-list"
        aria-label="Available hotel results"
        onFocusCapture={trackFocusedCard}
        onMouseOver={trackHoveredCard}
      >
        {children}
      </div>
    </div>
  );
}
