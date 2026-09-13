# Exceed reference capability gap audit — 14 September 2026

## Scope and method

An authorized demonstration property was reviewed in read-only mode. All 149 distinct routes exposed
by the authenticated navigation were opened, including Front Office, CRM, Housekeeping, POS/KDS,
Banquets, Stores, Accounts, Setup and Administration. No record was created, changed, printed,
exported, purchased or deleted. This document records generic hospitality capabilities only; it does
not copy Exceed source code, private data, branding, wording or visual design.

## Result

Mandyal already has the majority of the daily hotel operating model under its own property-scoped
architecture. Equivalent capabilities include reservations and walk-ins, room rack and room state,
guest registration and self-service, folios and cashier controls, night audit, housekeeping and
maintenance, POS/KDS, restaurant catalogue and reservations, banquets, stock and goods receipt,
vendors, guest CRM, booking engine readiness, GST preparation, immutable accounting evidence, Tally
export, RBAC, 2FA and audit history.

The comparison is additive. Existing Mandyal modules remain unchanged.

| Reference capability family                                                  | Mandyal position after this review                                | Decision                                                                                                                                                                          |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Found-property registration, custody and return                              | Previously documented but no operational workspace                | Added as the live Lost and Found workspace with property scope, immutable events, optimistic concurrency, idempotency, controlled return evidence and administrator-only disposal |
| Occupancy and availability forecast                                          | Current operational and seven-day room projections exist          | Retain; extend only when historical data quality supports a defensible forecast                                                                                                   |
| Purchase orders, approval, partial GRN and supplier performance              | Reorder and immutable goods-receipt evidence are live             | Controlled expansion required; do not represent purchasing authority or supplier payment as live before approval roles and reconciliation are implemented                         |
| Stock transfer, manufacturing receipt, recipe consumption and expiry         | Immutable receipt/issue ledger and reorder controls are live      | Add as separate governed workstreams; avoid silently rewriting stock or auto-consuming without approved recipes and reversal rules                                                |
| Manual journals, contra, opening balances, cash/bank books and balance sheet | System-generated balanced journals and management P&L are live    | Keep manual/statutory accounting gated until finance ownership, period locks, reversals, bank reconciliation and tax review are approved                                          |
| Credit notes and GST e-invoicing                                             | GST preparation statement is live and clearly non-statutory       | Keep blocked pending GST profile, numbering, place-of-supply, IRP/provider and tax-adviser approval                                                                               |
| Configurable invoice/folio print layouts and bill prefixes                   | Safe existing booking/GST documents are available                 | Candidate enhancement; statutory numbering must remain immutable and legally reviewed                                                                                             |
| Multi-currency conversion                                                    | Currency-conflict fail-closed controls exist                      | Keep conversion gated until a contracted rate source, timestamping, spread, rounding and settlement policy exist                                                                  |
| KOT printer and electronic door-lock interfaces                              | KDS is live; hardware adapters are absent                         | Keep provider-gated; never claim device integration without certified hardware and monitoring                                                                                     |
| Email, WhatsApp and automated reminders                                      | Email infrastructure exists; journeys are a controlled foundation | Retain consent, suppression, sender approval and delivery-evidence gates                                                                                                          |
| Feedback questions and public-review links                                   | Verified-stay reviews and moderation are live                     | Retain Mandyal's verified-stay governance; configurable questionnaires are an optional later enhancement                                                                          |
| Login/device and user activity reporting                                     | Access control, 2FA and immutable partner audit are live          | Retain; expose only privacy-minimized device data required by an approved security purpose                                                                                        |

## Improvements deliberately not copied

The reference print utility returned a framework error page containing internal controller and method
details when opened without required parameters. Mandyal should continue returning bounded public
errors and must not expose stack, controller, database or secret information. Demo-only Tally and
provider-purchase controls were also not treated as evidence of production readiness.

## Next governed delivery order

1. Lost and Found — delivered by this review.
2. Purchase-order approval and partial goods-receipt matching.
3. Store-to-store transfer, expiry lots and reversible wastage controls.
4. Forecasting with explicit data sufficiency and accuracy labels.
5. Configurable operational document templates, without weakening statutory controls.

Manual statutory accounting, GST e-invoicing, currency conversion, WhatsApp, payment collection,
external OTA synchronization, printer and lock hardware remain dependent on their existing legal,
commercial or provider gates.
