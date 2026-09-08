# Mandyal PMS additive capability catalogue

This catalogue maps the requested hotel-management scope to the existing Mandyal PMS. It is
additive: no existing module is removed. A capability is labelled **Live** only when its governed
workflow exists in the portal. **Foundation** means reusable controls exist but an operational or
provider gate remains. **Planned** means the workspace is visible while transactions stay disabled.

## Front desk and reservations

- Live: reservations, walk-in booking, room rack and allotment, guest check-in/check-out, group
  bookings and banquets, guest registration, and guest profiles/CRM.

## Billing and payment processing

- Live: append-only folios, operational service charges, deposits, corrections, cashier shifts,
  and controlled GST preparation.
- Foundation: multiple payment modes. Live card or digital tendering still requires certified
  payment, webhook, reconciliation, refund, and chargeback controls.
- Planned: split billing, routed charges, discounts, and statutory tax/accounting expansion.

## Housekeeping and maintenance

- Live: cleaning/readiness status, attendant work, inspections, housekeeping controls, laundry,
  minibar services, maintenance requests, downtime, and stock movements.

## Restaurant and food service

- Live: point-of-sale service orders, kitchen order tickets, controlled folio posting and cashier
  evidence.
- Planned: table reservations, menu/modifier management, QR ordering, and captain/mobile workflows.

## Inventory and procurement

- Live: property SKUs, receipts, issues, reorder controls, goods-receipt evidence and procurement
  worklists.
- Live: property-scoped vendor registration, contact ownership, payment terms, reasoned pause or
  reactivation and immutable decision history.
- Planned: purchase-order approvals, supplier performance scoring and vendor payment release.

## Guest experience

- Live: verified-stay feedback, moderated reviews, property responses and guest CRM.
- Foundation: automated email and WhatsApp journeys. Email infrastructure exists; WhatsApp requires
  approved sender, templates, consent/opt-out handling, delivery webhooks and production credentials.

## Security and compliance

- Live: supplier-scoped role-based access, secure invitations, audit history and masked identity
  references.
- Foundation: dedicated privacy/data-rights operations. Legal sign-off remains required before any
  claim of complete GDPR or statutory compliance.

## Reporting and analytics

- Live: occupancy, ADR, RevPAR, arrival/departure, folio, cashier, operational revenue and immutable
  audit reporting.
- Planned: approved expense capture and management profit-and-loss reporting. These will not be
  described as statutory accounts until finance ownership and reconciliation are approved.

## Channel manager

- Live: provider registry, property/room/rate mapping, synchronization review, retry and audit
  foundations.
- Planned: contracted external OTA connectivity at scale. No claim of connectivity to 100+ OTAs is
  made until providers approve, certify and activate the relevant adapters.

## Other integrations

- Live: governed direct booking-engine readiness and mobile-responsive portal workflows.
- Planned: captain/native mobile applications and versioned Tally-compatible XML export. Tally
  activation requires an agreed schema, accounting review, reconciliation and secure delivery.
