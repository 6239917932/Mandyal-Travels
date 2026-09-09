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
production workflow, while foundation modules open a controlled scope workspace that cannot submit
unfinished transactions. The registry currently contains no planned placeholder routes.

Phase 1 closes with a governed Night Audit that checks cashier shifts, arrivals, departures,
amendments and urgent maintenance before an administrator can advance the property operational
date. Every close preserves an immutable readiness snapshot. Phase 2 begins with an
administrator-only Owner Overview. It derives occupancy, ADR, RevPAR, booked accommodation value,
folio collections and outstanding balances from the shared property, booking and append-only folio
records. The view is property-scoped and bounded, withholds financial totals when a safety limit or
mixed currency would make them incomplete, and labels allocated stay value separately from
statutory invoices or recognized accounting revenue.

The PMS registry exposes this workflow once as Owner Overview. The earlier Analytics and KPI alias
used the same route and data, so it was removed instead of maintaining duplicate navigation and
ambiguous active-state behavior.

Access Control now has its own live supplier team directory rather than sharing the activity-log
destination. It uses hashed, revocable seven-day invitations, administrator and operator roles,
last-administrator protection, forced session revocation after role changes, and partner-scoped
immutable audit entries. The activity log remains a separate read-only governance view.

The Attendant View is now live as a prioritized projection of the same bounded room, inspection and
maintenance workspace. It orders out-of-service and urgent-maintenance rooms before dirty,
cleaning, failed-inspection and ready rooms, while preserving deterministic property and natural
room-number ordering. Attendants use the existing protected room-status endpoint and idempotent,
audited inspection workflow; no duplicate assignment, room, inspection or maintenance store was
introduced. The older housekeeping page now also uses this shared bounded service instead of its
previous unbounded direct query.

Fixed Assets is now live as a property-scoped equipment and custody register. Supplier
administrators can record a unique asset tag, invoice provenance, acquisition date and exact
integer-safe cost, then append retry-safe physical-verification or movement evidence. Updates use
optimistic concurrency, every mutation writes the partner audit trail, and the workspace has bounded
register and event views. It does not treat consumable stock or repairs as capital assets and does
not calculate depreciation, disposal gains or statutory accounting entries until an approved
capitalization and tax policy exists.

Phase 2 service operations now begin with a shared Point of Sale and kitchen queue. A hotel operator
can place a bounded room-service or outlet order only against a checked-in stay owned by the active
partner and managed property. Orders keep immutable, versioned state events from placed through
accepted, preparing and ready. The final serve action and its guest charge commit atomically into the
existing append-only folio; retries are idempotent, concurrent stale actions are rejected, cancelled
orders require a reason, open orders block checkout and Night Audit, and posted orders cannot be
edited or deleted. This operational charge is
not represented as a GST invoice, inventory depletion, gateway payment or recognized accounting
revenue.

Laundry and minibar are now live on that same property-scoped service-order ledger instead of a
second guest, booking, charge or folio store. An operator can create an itemized order only for an
assigned room on a checked-in stay. Laundry follows placed, accepted, preparing and ready states;
minibar follows placed and accepted verification before posting. Completion and the corresponding
`LAUNDRY` or `MINIBAR` folio charge commit atomically, transitions are versioned, retries are
idempotent, early cancellation requires a reason, and unfinished services block checkout and Night
Audit. The POS and kitchen workspaces remain isolated to room-service and outlet orders while the
dedicated Laundry workspace shows only laundry and minibar work. These records do not claim stock
depletion, a GST invoice, gateway payment or recognized accounting revenue.

Phase 2 finance outputs now add an administrator-only, property-scoped daily operational report
over the existing booking, append-only folio, cashier-shift, service-order and Night Audit records.
The report accepts a bounded date range, exposes a bounded CSV export, and withholds every financial
total and export when source rows are truncated or currencies conflict. Its values are operational
ledger activity, not recognized accounting revenue or a GST return.

The GST workspace similarly reuses each confirmed booking's immutable marketplace tax snapshot and
the platform-reviewed supplier identity. It can print a preparation statement, but statutory
issuance is deliberately disabled: the document is prominently marked `NOT A TAX INVOICE`, has no
invented invoice number or tax split, and keeps supplemental folio charges separate until their tax
classification is approved. Statutory invoice numbering, place-of-supply logic, SAC/HSN,
CGST/SGST/IGST, credit notes, retention and e-invoicing remain blocked pending tax-adviser approval
and a separately audited implementation.

Phase 3 begins with a property-scoped group and banquet event diary. Partner administrators can
record bounded enquiries and quotations, then progress them through provisional, confirmed,
completed or reasoned-cancellation states. Provisional and confirmed events prevent overlapping
holds for the same named function space and local event date/time. Creation and every transition
are idempotent, serialized, version checked and appended to both dedicated history and the partner
audit trail. The diary deliberately does not block guest rooms, collect deposits, issue tax
invoices, post accounting revenue or send customer messages until those governed integrations are
implemented.

Central Reservations is now live as a bounded multi-property projection over the existing booking
source. It calculates arrivals, departures, in-house rooms and assignment exceptions against each
property's own controlled operational date, and presents a deterministic fourteen-day forward
arrival queue. The server includes only active managed properties belonging to the authenticated
hotel partner and fails closed for foreign slugs, cancelled bookings and closed stay states. All
reservation and stay mutations remain in the established paginated reservation desk, so this view
does not introduce a parallel booking or guest record.

The Guest CRM now provides a read-only, property-scoped view over the same confirmed booking guest
records. It groups normalized booking identities only inside the server-only data-access layer and
returns masked contact details, bounded recent stay history, deterministic recognition labels,
reservation-level requests and consent-backed registration counts. It creates no duplicate guest
identity, exposes no document reference, carries no request into a future stay automatically and
never treats booking or registration consent as permission for marketing.

Stock and Inventory is now live with property-scoped SKUs and an immutable movement ledger. Opening
balances are movements rather than mutable counters; posting is idempotent, rejects stale versions
and prevents negative stock. Procurement reuses this ledger for reorder and receipt evidence rather
than creating a second inventory store. Vendor contracts, purchase-order approvals and payments
remain explicit human and commercial controls.

Vendor Management is now live as an administrator-only, property-scoped supplier directory. It
records normalized vendor identity, business contact ownership, supply category, bounded payment
terms and commercial notes, while unique property vendor codes prevent accidental duplicates.
Reasoned pause and reactivation actions use optimistic concurrency, retry-safe idempotency and an
immutable event history. The directory cannot approve purchase orders, release payments or store
bank account numbers, UPI credentials, PINs or OTPs; procurement and finance authority remain in
their separate controlled workflows.

Restaurant Menus and Tables is now live as the property-scoped operating catalogue and reservation
diary for named outlets, dining-table capacity and priced menu items. Supplier administrators
register each record through bounded validation, retry-safe creation and immutable opening evidence;
pause, out-of-service and restoration decisions require a reason, optimistic version and append-only
event. Table reservations occupy unique half-hour locks, reject concurrent conflicts, enforce table
capacity, and release future locks only through controlled terminal states. The workspace deliberately
reuses the existing Point of Sale, kitchen queue and guest folio instead of creating another order or
billing store. QR ordering, payment collection and automatic stock depletion remain separate gated
workflows.

The Guest Portal is live as a governed view over the existing customer account and booking records;
it creates no second identity, password or consent database. Fixed Assets, Telephone and EPABX, and
HR and Payroll now have dedicated controlled foundation workspaces instead of dead or duplicate
navigation. They expose only existing, authorized property, maintenance, reservation or partner-team
evidence and deliberately do not fabricate depreciation policy, call records, payroll, attendance,
bank, tax, medical or other regulated data before the required provider and legal approvals exist.
