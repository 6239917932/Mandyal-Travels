# Platform feature controls

The configuration workspace at `/admin/configuration` provides a closed set of release controls.
Only an authenticated `PLATFORM_ADMIN` can change them. Every change requires a reason between 10
and 500 characters, checks the last reviewed version, increments that version, and stores an
append-only event with the administrator and timestamp.

Current controls:

- `AI_TRIP_PLANNER` pauses the public trip-planner page and `POST /api/v1/ai/trip-plans`.
- `PARTNER_APPLICATIONS` pauses the new-application page and
  `POST /api/v1/partners/applications`. Existing partner memberships and workspaces remain available.

The absence of an override uses the reviewed catalogue default, so deploying the additive migration
does not unexpectedly disable a working feature. These controls do not activate providers, alter
bookings or inventory, change payment/refund state, or configure Cashfree. Adding a new control
requires a typed catalogue entry, enforcement at every relevant page and API boundary, regression
tests, and operational documentation.
