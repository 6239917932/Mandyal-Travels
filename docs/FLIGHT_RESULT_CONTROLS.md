# Flight result controls

The public flight results page treats supplier search state and customer-side result controls as
separate concerns:

- Search failures show only the recoverable error state; they are not presented as zero inventory.
- A successful search with no returned offers shows the source-empty state.
- A successful search with returned offers that are all excluded by customer controls shows the
  filter-empty state and a clear-filters action.
- Airline controls are accepted only when the airline occurs in the current returned catalogue.
- Clearing controls retains the complete one-way, return, or multi-city itinerary, passenger count,
  and cabin class while removing only airline, price, refundable-only, and sort controls.

These controls operate only on normalized offers already returned by the flight search adapter. They
do not change supplier requests, availability revalidation, checkout, payment, or the
provider-pending status of the flight flow.
