# PMS guest CRM

The guest CRM is a read-only, property-scoped projection of confirmed hotel bookings already owned
by the signed-in supplier. It deliberately does not introduce another guest identity store.

Profiles are grouped by a normalized booking email inside the server-only data-access layer. The UI
receives only a bounded DTO with a masked email, masked phone, display name, stay count, recognition
label, recent stay dates, reservation-level requests and the count of consent-backed guest
registration references. Full identity references and registration fingerprints never enter the
projection.

The workspace reads at most 100 active managed properties, 500 confirmed bookings, 200 profiles and
20 stays per selected profile. Crossing a limit produces a visible safety warning rather than an
apparently complete result.

Recognition is deterministic: zero or one recorded stay is first-stay, two to four is returning and
five or more is frequent. It is an operational label only. Reservation requests are not copied into future
bookings, and neither a stay nor an identity-inspection consent authorizes marketing. Promotional
contact remains governed by the customer consent centre.
