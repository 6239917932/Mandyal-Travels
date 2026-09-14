# Public hospitality-platform benchmark — 14 September 2026

## Scope and evidence boundary

This review compares the publicly advertised capabilities of
[AxisRooms](https://www.axisrooms.com/), [Roomnexa](https://www.roomnexa.com/),
[Zotel](https://www.zotel.ai/) and [Hotel-Spider](https://www.hotel-spider.com/) with the
implemented Mandyal PMS capability catalogue. It is a public-product benchmark, not an authenticated
acceptance test. Vendor marketing claims are recorded as claims; they are not proof of operational
quality, regulatory compliance, integration certification or production availability.

The review is additive. It does not copy vendor source code, private data, wording, branding or visual
design, and it does not remove or weaken an existing Mandyal module.

## Executive result

Mandyal already implements the principal hotel operating system shown across the four public sites:
property and room setup, rates and restrictions, central reservations, room rack, direct and walk-in
bookings, check-in/out, guest records, folios, cashier and payments, POS/KDS, housekeeping,
maintenance, inventory, procurement, CRM, reviews, multi-property control, role-based access, night
audit, GST preparation, reports, ADR, RevPAR, booking pace, source mix and a responsive owner portal.

The public benchmark identified two useful provider-independent product gaps and several capabilities
that must remain explicitly gated. The first gap was delivered immediately after the review:

1. delivered: a governed revenue-intelligence workspace with a thirty-day demand calendar,
   capacity exceptions, transparent review prompts and data-sufficiency labels;
2. configurable pre-arrival packages, upgrades and add-ons that flow into quote, payment, reservation
   and folio evidence;
3. external OTA, GDS, metasearch, Google Hotels, competitor-rate shopping, live currency conversion
   and WhatsApp delivery remain unavailable until the required provider agreements, credentials,
   certification, consent, reconciliation and monitoring controls exist.

## Capability comparison

| Capability family                          | Public vendor evidence                                                                                    | Mandyal position                                         | Decision                                                                                                                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Front desk, reservations and room calendar | Roomnexa and Zotel advertise connected front-desk, live room status and reservation workflows             | Live                                                     | Retain Mandyal's property-scoped front desk, reservations, walk-in, room rack, registration, check-in/out and night audit                                                                |
| Rates, restrictions and inventory          | All four advertise centralized rate and availability control                                              | Live for Mandyal inventory                               | Retain rate plans, dated inventory, minimum stay, arrival/departure restrictions and stop-sells                                                                                          |
| Two-way OTA synchronization                | AxisRooms and Hotel-Spider advertise real-time reservation, rate and availability exchange                | Planned external-provider workspace                      | Preserve mapping, action-sheet, retry, reconciliation and audit foundations; do not claim automated OTA connectivity before certification                                                |
| Direct booking engine                      | AxisRooms, Zotel and Hotel-Spider advertise direct booking and integrated payment journeys                | Live for Mandyal inventory                               | Retain public search, server-derived quote, governed promotion, booking and payment-confirmation controls                                                                                |
| Source/channel performance                 | AxisRooms and Hotel-Spider advertise channel contribution reporting                                       | Live                                                     | Mandyal Owner Overview already shows source mix, booking counts and booked value with completeness and currency safeguards                                                               |
| ADR, RevPAR, occupancy and booking pace    | AxisRooms, Roomnexa and Zotel advertise revenue KPIs and pacing                                           | Live                                                     | Mandyal Owner Overview already presents operational-day KPIs, seven-day history and forward booking pace                                                                                 |
| Demand calendar and forecasting            | AxisRooms and Zotel advertise demand forecasting or demand-calendar capabilities                          | Partial                                                  | Add only from Mandyal's own complete historical data, with sample-size, horizon, confidence and forecast-error disclosure                                                                |
| Dynamic or AI pricing                      | AxisRooms, Roomnexa and Zotel advertise automated or suggested pricing                                    | Controlled foundation                                    | Begin with reviewable recommendations, floor/ceiling constraints, reason codes, approval and rollback; no autonomous rate publication yet                                                |
| Competitor rate shopping                   | AxisRooms advertises competitor-price monitoring                                                          | External-provider dependent                              | Do not scrape or infer competitor prices; activate only with a lawful contracted data source and provenance                                                                              |
| Packages, upgrades and add-ons             | AxisRooms, Zotel and Hotel-Spider advertise packages, upsells or custom experiences                       | Live                                                     | Property-scoped pre-booking catalogue, date and quantity controls, tax calculation, immutable quote snapshots, hosted-payment totals, refund totals and folio presentation are delivered |
| Promotion codes                            | Hotel-Spider advertises flexible promotions; AxisRooms advertises targeted offers                         | Live                                                     | Retain database-backed campaign approval, validity, eligibility, capacity and redemption evidence                                                                                        |
| Guest folio and outlet posting             | Roomnexa and Zotel advertise POS/restaurant charges posted to the guest account                           | Live                                                     | Retain append-only folios, POS/KDS, laundry, spa, minibar and split-billing controls                                                                                                     |
| Housekeeping assignment and room readiness | Roomnexa and Zotel advertise live room status and staff task assignment                                   | Live                                                     | Mandyal housekeeping requests, attendant view, inspections, maintenance context and readiness cover this operating need                                                                  |
| Guest CRM, self check-in and reviews       | Zotel advertises CRM, self check-in and automated review requests                                         | Live/controlled                                          | CRM, guest portal and verified-stay reviews are live; outbound automation remains consent and provider gated                                                                             |
| Email and WhatsApp journeys                | Roomnexa and Zotel advertise WhatsApp confirmations and guest messaging                                   | Email live; WhatsApp foundation                          | Preserve sender, template, consent, suppression, delivery-webhook and opt-out gates                                                                                                      |
| Multi-property operation                   | AxisRooms, Zotel and Hotel-Spider advertise group or multi-property views                                 | Live                                                     | Retain property selection, central reservations and bounded group visibility                                                                                                             |
| Payment automation and deposits            | Hotel-Spider advertises policy-based validation, pre-authorization, deposits and direct charges           | Foundation/live by tender                                | Mandyal captured-payment gates, tender evidence, corrections, refunds, reconciliation and settlement controls remain authoritative; provider functions require approved credentials      |
| Multi-language and currency conversion     | Hotel-Spider advertises multilingual booking and currency conversion; AxisRooms advertises multi-currency | Translation/conversion gated                             | Do not expose machine-translated transactional terms or live conversion without professional review, rate provenance, rounding and settlement policy                                     |
| Branded hotel website and SEO              | Zotel advertises property websites and SEO                                                                | Marketplace listing live; standalone site builder absent | Keep Mandyal's searchable owner inventory and structured public listing; treat per-property website building as an optional separate product, not a PMS launch blocker                   |
| Google Hotels and metasearch               | Zotel and Hotel-Spider advertise Google Hotels/metasearch distribution                                    | Planned external-provider capability                     | Requires merchant/feed approval, accurate price/availability feeds, landing-page parity, monitoring and commercial ownership                                                             |
| GDS distribution                           | Hotel-Spider advertises Amadeus, Sabre and Travelport connectivity                                        | Planned external-provider capability                     | Keep outside live PMS claims until agreements, identifiers, certification and servicing ownership exist                                                                                  |
| Mobile operation                           | The vendors advertise mobile-friendly owner and booking experiences                                       | Live responsive web workflows                            | Retain responsive front-office/captain workflows; do not describe them as native mobile applications                                                                                     |

## Source-specific observations

### AxisRooms

The public [Channel Manager](https://www.axisrooms.com/products/hotel-channel-manager/) emphasizes
rate, restriction, inventory and reservation synchronization, channel performance and multi-property
control. Its [Revenue Management System](https://www.axisrooms.com/products/revenue-management-system/)
adds demand forecasting, booking pace, competitor-rate visibility, pricing recommendations and
automated rate updates. Its [Booking Engine](https://www.axisrooms.com/products/hotel-booking-engine/)
advertises packages, upgrades, add-ons, promotion support and payment-to-folio integration.

Mandyal already covers the core PMS and internal revenue KPIs. Forecasting, rate shopping and
external publication need the gates described above; configurable pre-booking add-ons are the useful
independent product gap.

### Roomnexa

Roomnexa's public [product page](https://www.roomnexa.com/) and
[PMS guide](https://roomnexa.com/learn/blog/hospitality-property-management-system-guide) present an
all-in-one PMS, booking engine, channel manager, dynamic pricing, housekeeping, POS, inventory, CRM,
reporting and role-controlled multi-device operation.

Mandyal already covers these operational families. Its deliberately gated areas—external channels,
automated pricing and WhatsApp—must not be relabelled as live solely to match a competitor's public
feature list.

### Zotel

Zotel's public [platform page](https://www.zotel.ai/) advertises booking and payments, Google Hotels,
SEO websites, channel management, AI pricing, front desk, WhatsApp, revenue management, POS,
restaurant/KOT, housekeeping, multi-property management and reviews.

Mandyal already covers the daily hotel workflows. Demand-calendar presentation and pre-booking
upsells are appropriate additions; Google Hotels, WhatsApp delivery and automated external-rate
publication remain provider dependent.

### Hotel-Spider

Hotel-Spider's public [Channel Manager](https://www.hotel-spider.com/channel-manager/) emphasizes
two-way inventory, rate and reservation synchronization plus channel performance. Its
[Booking Engine](https://reservations.hotel-spider.com/) advertises policy-driven payments,
multi-property search, packages, add-ons, promotions and mobile-first direct booking. It separately
advertises [GDS](https://www.hotel-spider.com/gds-global-distribution-systems/) and
[metasearch](https://www.hotel-spider.com/meta-search-connectivity/) distribution.

These reinforce the same decision: improve Mandyal's provider-independent revenue and add-on tools,
while keeping third-party distribution clearly unavailable until a real connection is approved and
certified.

## Governed delivery order

1. Revenue intelligence core — delivered: thirty-day demand calendar, seven-day occupancy chart,
   capacity exceptions, booking-history sufficiency and transparent review-only prompts. Longer
   prior-period and cancellation-trend comparisons remain an evidence-dependent extension.
2. Booking add-ons and packages — delivered: property catalogue, availability window, tax
   treatment, immutable quote snapshot, payment allocation, cancellation/refund handling and
   folio presentation without duplicate charges.
3. Store transfer, expiry lots and reversible wastage controls — delivered: property store master,
   batch/location balances, thirty-day expiry posture, atomic internal transfers, main-ledger
   reconciliation and compensating reversals without rewriting event history.
4. Configurable operational documents without weakening statutory numbering or invoice controls.
5. Provider activation work only when Mandyal or a hotel has the necessary commercial access.

No public competitor claim changes Mandyal's legal, payment, tax, privacy, security or provider
activation gates.
