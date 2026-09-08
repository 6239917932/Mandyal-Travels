# PMS billing and cashier operator workflow

## Scope

The Billing and cashier workspace provides one booking-owned operational folio for each active
hotel stay. It extends the existing booking and payment records; it does not create a parallel
reservation, payment, refund, accounting or tax-invoice system.

The system-derived accommodation charge is the confirmed booking value. A captured online payment
is also derived from the existing payment record. Staff can add incidental charges, while a partner
administrator can record partial deposits or at-property payments after opening a cashier shift.

## Start and close a cashier shift

1. Sign in as the hotel partner administrator.
2. Open **Billing and cashier** from the persistent PMS sidebar.
3. Confirm the selected property and business date.
4. Enter the whole-INR opening cash float and open the shift.
5. Record cash, card, UPI or bank-transfer payments against the correct active folio. Only cash
   payments affect the expected cash drawer total.
6. At shift close, count the cash drawer and enter the declared whole-INR amount. The shift closes
   only when it exactly equals opening float plus cash receipts minus cash-payment reversals.

Each administrator has at most one open shift per property. Every open, close, posting and reversal
uses an idempotency key, runs inside a serializable transaction and writes a partner audit event.

## Post or correct a folio entry

- Operators and administrators may post room-service, laundry, minibar, damage or other charges.
- Only administrators may record payments or post corrections.
- A partial payment is retained as a deposit against the same folio balance.
- Posted entries cannot be edited or deleted. Correct an error by entering a reason and posting the
  linked reversal.
- Reversing an at-property payment requires an open cashier shift so the cash reconciliation remains
  complete.

Do not use a negative posting to correct a mistake. Do not record an online payment again: captured
online payments already appear automatically from the booking's authoritative payment record.

## Checkout and document boundary

Checkout fails safely while the operational folio has a positive balance. Staff must record an
authorized settlement or correct the ledger before trying checkout again. An overpaid folio is
visible as a negative balance and requires human review; it is not silently refunded.

This workspace displays a provisional operational folio only. It is not a statutory GST invoice,
credit note, gateway refund or settlement instruction. Those actions remain in their governed
finance workflows until their legal and provider controls are live.
