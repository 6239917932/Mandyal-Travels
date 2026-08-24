# Editable guided trip plan

The guided trip planner returns a deterministic, server-validated suggestion with links to the
portal's inventory-backed Hotel, Flight, Bus, and Car searches. A traveller can edit the displayed
title and guidance for each suggested day and reset all edits to the original suggestion.

## Boundaries

- Edits live only in React state for the current browser view. They are not written to local
  storage, an account, a database, or a provider.
- Refreshing or leaving the page discards edits. The interface states this before the editable
  fields.
- Editing does not hold inventory, change availability or price, create a booking, or initiate a
  payment.
- Day titles are limited to 80 characters and guidance to 280 characters. Empty or whitespace-only
  values return to the server suggestion when the field loses focus.
- Search destinations and query strings remain the immutable links produced by the validated
  server planner. A traveller must open them to check live inventory, policies, and final prices.
- The feature makes no claim that an external AI provider is active. No provider or Cashfree code is
  used or changed.

## Accessibility

Every field has a day-specific label and an associated character count and editing notice. Reset
feedback uses a polite status region, keyboard focus uses a visible outline, and the cards collapse
to one column on small screens.

## Verification

`tests/editable-trip-plan.test.mts` covers hard bounds, empty-value recovery, ephemeral/mutation-free
behavior, immutable search-link rendering, and accessible field wiring. Existing planner tests
continue to cover server validation and inventory search link construction.
