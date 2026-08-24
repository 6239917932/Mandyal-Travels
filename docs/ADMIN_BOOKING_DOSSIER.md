# Administrator booking dossier

`/admin/bookings/[confirmationCode]` provides a read-only operational summary for Hotel, Flight,
Bus, and Car bookings. The route requires the existing platform-administrator session and returns
not found for invalid references, unknown records, or transport records outside the closed product
catalogue.

## Data boundary

- Hotel records select only customer-visible booking facts, bounded amendment/refund/support
  summaries, and the payment values required to compute document readiness.
- Transport records parse their stored detail object through a product-specific scalar allowlist.
  Unknown fields, nested passenger/driver/contact objects, malformed JSON, and unsupported products
  are ignored.
- Activity collections are limited to the latest 20 records while retaining an aggregate count.
- The dossier never renders authentication material, supplier/provider identifiers or payloads,
  payment checkout links, internal finance/reconciliation commentary, partner servicing notes,
  private review notes, identity documents, or raw stored JSON.

## Authority boundary

The dossier has no form, route handler, or mutation action. It cannot change bookings, inventory,
payments, refunds, amendments, documents, or support cases. Links lead administrators to the
existing booking directory, user, document, finance, amendment, and support workbenches, where the
established permissions, validation, and audit controls remain authoritative.

Cashfree and all provider configuration remain unchanged.

## Verification

```powershell
node --experimental-strip-types --test tests/admin-booking-dossier.test.mts
npm run check
npm audit --audit-level=high
```
