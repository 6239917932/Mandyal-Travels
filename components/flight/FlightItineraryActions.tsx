'use client';

export function FlightItineraryActions() {
  return (
    <button
      className="ui-button ui-button--primary flight-itinerary__print"
      onClick={() => window.print()}
      type="button"
    >
      Print itinerary
    </button>
  );
}
