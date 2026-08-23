# Administrator finance workbench

`/admin/finance` is the human-governed register for payment reconciliation and refund review. It
does not activate or configure a payment provider.

## Safety boundary

- Only platform administrators can open the page or call its mutation routes.
- Only captured payments can be reconciled or used to create a refund request.
- A payment can be marked matched only when the entered provider amount and currency equal the
  captured transaction.
- Refund creation remains limited by the unrefunded captured balance inside a serializable
  transaction.
- Pending refunds may be approved or rejected. A provider-failed refund may be retried but cannot
  be rejected as though it were still pending.
- Provider references stay server-side. The page presents deterministic private correlation
  references and redacts direct identifiers from human-entered narratives.

## Completeness controls

Payment and refund registers have independent 25-row pagination, exact filtered counts, bounded
closed-catalogue filters, and a 1,000-result deep-history guard. The global pending-refund metric is
an exact database count and is not inferred from the current page.

Filters cover payment status, reconciliation state, refund status, created window, and bounded
booking/payment lookup. If a result set exceeds the deep-history guard, administrators must narrow
the filters instead of receiving a silently incomplete register.

Balanced journals, tokenized payout batches, and the compatibility ledger remain read-only on this
page. Their external references are represented only by private correlation values.

## Provider readiness

The workbench is provider-neutral. Live authorization, capture, refund dispatch, webhook
verification, and settlement reconciliation remain blocked until a provider contract, credentials,
signed commercial rules, and a production data platform are approved. Cashfree is not implemented,
configured, or modified by this workbench.
