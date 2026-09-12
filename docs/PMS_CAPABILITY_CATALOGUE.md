# Mandyal PMS additive capability catalogue

This catalogue maps the requested hotel-management scope to the existing Mandyal PMS. It is
additive: no existing module is removed. A capability is labelled **Live** only when its governed
workflow exists in the portal. **Foundation** means reusable controls exist but an operational or
provider gate remains. **Planned** means the workspace is visible while transactions stay disabled.

As verified on 12 September 2026, the registry contains 46 unique workspaces: 42 live, 3 controlled
foundations, and 1 planned external-provider workspace.

## Front desk and reservations

- Live: reservations, walk-in booking, room rack and allotment, guest check-in/check-out, group
  bookings and banquets, guest registration, and guest profiles/CRM.

## Billing and payment processing

- Live: append-only folios, operational service charges, deposits, corrections, cashier shifts,
  split billing, routed charges, discounts, cash/card-at-property/UPI/bank tender recording, and
  controlled GST preparation.
- Foundation: certified external payment collection. Live card or digital collection still requires
  approved payment credentials, webhooks, reconciliation, refund, and chargeback controls.
- Statutory boundary: GST invoice issuance remains blocked until the legal GST profile, state code,
  review, and tax-adviser approval are complete.

## Housekeeping and maintenance

- Live: cleaning/readiness status, attendant work, inspections, housekeeping controls, laundry,
  minibar services, maintenance requests, downtime, and stock movements.

## Restaurant and food service

- Live: point-of-sale service orders, kitchen order tickets, controlled folio posting, cashier
  evidence, outlet/table/menu management, conflict-protected table reservations, QR guest ordering,
  and captain/mobile service workflows.

## Inventory and procurement

- Live: property SKUs, receipts, issues, reorder controls, goods-receipt evidence and procurement
  worklists.
- Live: property-scoped vendor registration, contact ownership, payment terms, reasoned pause or
  reactivation and immutable decision history.
- Planned operational expansion: purchase-order approvals, supplier performance scoring, and vendor
  payment release remain outside the current controlled workflow.

## Guest experience

- Live: verified-stay feedback, moderated reviews, property responses and guest CRM.
- Foundation: automated email and WhatsApp journeys. Email infrastructure exists; WhatsApp requires
  an approved sender, templates, consent/opt-out handling, delivery webhooks and production
  credentials.

## Security and compliance

- Live: supplier-scoped role-based access, secure invitations, audit history, masked identity
  references, and privacy/data-rights operations.
- Legal boundary: these operational controls do not constitute a claim of complete GDPR or statutory
  compliance; jurisdiction-specific legal and privacy sign-off remains required.

## Reporting and analytics

- Live: occupancy, ADR, RevPAR, arrival/departure, folio, cashier, operational revenue, expense
  capture, payroll registers, provisional management P&L, and immutable audit reporting.
- Accounting boundary: management reports are not described as statutory accounts until finance
  ownership, tax treatment, and reconciliation are approved.

## Channel manager

- Live: provider registry, property/room/rate mapping, synchronization review, retry and audit
  foundations.
- Planned: contracted external OTA connectivity at scale. No claim of connectivity to 100+ OTAs is
  made until providers approve, certify and activate the relevant adapters.

## Other integrations

- Live: governed direct booking-engine readiness, mobile-responsive web workflows, and reviewed,
  balanced Tally-compatible XML export.
- Foundation: telephone/EPABX connectivity requires approved external hardware/provider integration.
- Native mobile applications remain a separate product decision; the responsive web application and
  captain workflow are live.
