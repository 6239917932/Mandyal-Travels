# Mandyal PMS reference audit and delivery contract

## Purpose

Mandyal Travels will add a full hotel property-management system alongside its OTA marketplace.
The reference review was performed through an authorized demo account. It records business
capabilities only. Mandyal will not copy another vendor's source code, branding, wording, screen
design, private data, or undocumented implementation.

## What Mandyal already has

The production platform already supplies the most difficult shared foundation:

- tenant-scoped partner accounts and administrator/operator roles;
- administrator-reviewed property publication;
- property, room-type, physical-room, amenity, policy, image and address records;
- multiple rate plans, seasonal prices, minimum/maximum stays, closed-to-arrival,
  closed-to-departure and stop-sell controls;
- public booking payment, tax snapshot, settlement and refund records;
- reservation search, room assignment, check-in, check-out, no-show and private desk notes;
- housekeeping readiness and out-of-service room state;
- channel connections, mappings and synchronization review;
- partner audit logs, KYC, agreements, payout destinations and tax profiles.

These remain the source of truth. The PMS extends them; it does not create a second property,
inventory, booking or identity database.

## Reference capability map

### Front office and hotel operations

- live operations dashboard and owner flash report;
- arrivals, departures, in-house stays and room rack/tape chart;
- individual, walk-in, group and corporate reservations;
- guest registration, KYC evidence, room allocation, check-in, move, no-show and check-out;
- folios, deposits, split bills, charges, receipts, refunds and cashier shifts;
- housekeeping tasks, inspections, minibar, lost-and-found and linen control;
- maintenance work orders, preventive schedules and room downtime;
- night-audit checklist, trial balance, nightly posting and operational-date close.

### Food, events and guest services

- outlet/table POS and room-service orders;
- kitchen tickets with controlled preparation states;
- banquet spaces, event diary, quotations, menus and banquet event orders;
- laundry orders and hotel-linen cycles;
- guest self-service and pre-arrival registration;
- guest profiles, preferences, stay history, consent and recognition.

### Revenue, finance and control

- rates, restrictions, inventory, channel mapping and booking-engine settings;
- GST invoice preparation, credit/debit notes and tax reports;
- double-entry journals, ledgers, receivables and daily collections;
- stock ledger, requisitions, vendors, quotations, purchase orders and goods receipt;
- fixed-asset register, depreciation and physical audit;
- operational, financial, statutory and management reports;
- staff directory, shifts, attendance, leave and payroll inputs;
- property-scoped RBAC, access simulation and immutable audit trails.

## Defects and claims intentionally excluded

The demo displayed inconsistent guest placeholders and implausible order-duration values. Those are
not requirements. External capabilities such as OTA synchronization, competitor prices, food
delivery, EPABX, e-invoicing and payment processing will only be labelled live after a real provider
connection, reconciliation handling, retries, monitoring and acceptance tests exist.

## Delivery phases

### Phase 1 — safe daily hotel operation

1. PMS control centre and property switcher.
2. Room rack, reservations and walk-in workflow.
3. Guest registration and document-reference controls.
4. Folios, charges, deposits, receipts and cashier shifts.
5. Housekeeping tasks, room inspections and maintenance work orders.
6. Night audit and immutable operational-date close.

Exit criteria: a hotel can complete a full walk-in and prepaid OTA stay from reservation through
checkout, invoice, room cleaning and next-day opening without manual database work.

### Phase 2 — service and revenue operation

1. POS, room service and kitchen display.
2. Laundry and minibar posting.
3. GST invoice outputs and operational reports.
4. Revenue dashboard and controlled channel synchronization.

Exit criteria: every guest charge reaches one auditable folio and the hotel's daily totals reconcile.

### Phase 3 — back office and guest growth

1. Groups and banquets.
2. Guest CRM and secure guest portal.
3. Stock, requisitions, procurement and accounting.
4. Multi-property central reservation views.

### Phase 4 — enterprise controls

1. Fixed assets and depreciation.
2. HR, roster, attendance and payroll inputs.
3. EPABX and specialized provider integrations.
4. Forecasting and competitor intelligence after data-quality validation.

## Non-negotiable controls

- Every database query and mutation must enforce partner and property scope on the server.
- Front-desk permissions must be separate from finance, rate, refund and administration permissions.
- Financial postings and night-audit closes are append-only; corrections use reversals.
- Room occupancy cannot overlap for the same physical room.
- Checkout cannot silently discard an unpaid balance.
- Inventory changes, guest-document access, folio changes, refunds and role changes require audit
  records.
- Sensitive identity documents are stored outside public web roots with short-lived access.
- No module is presented as live until it has persistence, authorization, validation, audit,
  automated tests, error recovery and a documented operator workflow.

## Current milestone

The original Mandyal PMS control centre is connected to live partner/property data. It reports the
operational date, occupancy, arrivals, departures, room readiness and pending amendments. Its live
room rack projects registered physical rooms, readiness and assigned stays across a bounded
seven-day window without creating a second room or reservation store. The guest register stores
only an inspected document type and its final four characters for active stays, requires recorded
consent or another lawful basis, prevents duplicate submissions and writes an operator audit event;
it never retains the full identity number or document image. The billing workspace now derives its
opening accommodation charge and any captured online payment from the existing booking and payment
records, then keeps property charges, partial deposits, at-property payments and corrections in an
append-only folio ledger. Payment collection is administrator-only, requires an open cashier shift,
uses idempotent serializable mutations and exact cash reconciliation, and blocks checkout while a
positive balance remains. It deliberately does not claim to issue GST invoices or perform gateway
refunds. The housekeeping board now preserves bounded inspection history, and the maintenance
workspace records idempotent room work orders with immutable, versioned status events. Opening a
work order takes the room out of service; unresolved work blocks reactivation, and completed work
requires a newer passed inspection before the room can return to service. Every approved module is
reachable from the persistent sidebar: live modules open their
production workflow, while foundation and planned modules open a controlled scope workspace that
cannot submit unfinished transactions.

Phase 1 closes with a governed Night Audit that checks cashier shifts, arrivals, departures,
amendments and urgent maintenance before an administrator can advance the property operational
date. Every close preserves an immutable readiness snapshot. Phase 2 begins with an
administrator-only Owner Overview. It derives occupancy, ADR, RevPAR, booked accommodation value,
folio collections and outstanding balances from the shared property, booking and append-only folio
records. The view is property-scoped and bounded, withholds financial totals when a safety limit or
mixed currency would make them incomplete, and labels allocated stay value separately from
statutory invoices or recognized accounting revenue.

Phase 2 service operations now begin with a shared Point of Sale and kitchen queue. A hotel operator
can place a bounded room-service or outlet order only against a checked-in stay owned by the active
partner and managed property. Orders keep immutable, versioned state events from placed through
accepted, preparing and ready. The final serve action and its guest charge commit atomically into the
existing append-only folio; retries are idempotent, concurrent stale actions are rejected, cancelled
orders require a reason, open orders block checkout and Night Audit, and posted orders cannot be
edited or deleted. This operational charge is
not represented as a GST invoice, inventory depletion, gateway payment or recognized accounting
revenue.
