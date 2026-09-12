# PMS controlled acceptance test — 12 September 2026

## Purpose and boundaries

This record documents an end-to-end acceptance test in the private Mandyal PMS trial workspace. It
does not represent a real guest stay, real supply fulfilment, employment, a bank instruction, a tax
invoice, or a live payment. Trial records are retained because the relevant financial and operational
controls are append-only.

## Test record

- Reservation: `MT09A19EC47A7B`
- Guest label: `Acceptance Test 20260912`
- Stay: 12–13 September 2026
- Room: Standard Demo Room 101
- Accommodation charge: ₹2,000
- Simulated room-service charge: ₹100
- Simulated served POS order: ₹150
- Recorded split settlement: ₹1,000 cash and ₹1,250 UPI at property
- Simulated food-supplies expense: ₹50
- Simulated payroll register: ₹1,000 gross/net, with no deductions guessed

## Verified workflow

| Area             | Result                | Evidence                                                                                              |
| ---------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| Reservation      | Pass                  | Future-dated stay created and assigned to room 101                                                    |
| Check-in         | Pass                  | Assigned reservation moved to checked-in state                                                        |
| Guest identity   | Safely blocked        | A real inspected document and lawful basis/consent are required; no fictional reference was submitted |
| Folio and POS    | Pass                  | Accommodation, room-service, and served kitchen order posted to the folio                             |
| Split billing    | Pass                  | Two test tenders settled the ₹2,250 folio to ₹0                                                       |
| Checkout         | Pass                  | Settled stay checked out successfully                                                                 |
| GST invoice      | Safely blocked        | GSTIN, state code, profile review, and tax-adviser approval are required                              |
| Housekeeping     | Pass                  | Checkout marked room dirty; cleaning and passed inspection returned it to ready                       |
| Cashier          | Pass                  | Zero-float shift reconciled with expected and declared cash of ₹1,000                                 |
| Night audit      | Pass                  | Open-shift blocker worked; after reconciliation, 12 September closed and advanced to 13 September     |
| Expenses/payroll | Pass                  | ₹50 operational expense and ₹1,000 simulated payroll register recorded                                |
| P&L              | Pass                  | ₹2,250 revenue less ₹1,050 expenses produced ₹1,200 provisional result                                |
| Reports          | Pass                  | One arrival, one departure, charges/payments, cash collections, and night-audit closure appeared      |
| Tally XML        | Pass                  | Two eligible journals balanced at ₹1,050 debit and ₹1,050 credit; no excluded journals                |
| Access control   | Pass with launch gate | Administrator/operator separation verified; administrator authenticator enrollment remains required   |

## Automated verification

- Domain and security suite: 762/762 passing.
- Focused mobile-readiness, mobile-workspace, registry, and provider-gate tests: 12/12 passing.
- Static route verification: 541/541 internal links resolve.
- Production build: 265 application routes.

## Remaining controlled gates

1. Add and review the legal GST profile before generating a statutory GST invoice.
2. Repeat guest identity registration only with a real consenting tester and an actually inspected
   document; retain only the permitted masked reference.
3. Enroll the platform administrator's authenticator.
4. Complete legal, privacy, tax, restore-drill, operational ownership, and supplier approvals.
5. Keep PayU collection, WhatsApp, telephone/EPABX, and external OTA synchronization disabled until
   their respective providers are contracted and certified.

The internal PMS workflow is suitable for controlled trial use. This record does not authorize live
payment collection, supplier payout, statutory invoicing, or unapproved external-channel activity.
