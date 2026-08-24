# Customer support case detail

Authenticated customers can open a support case from `/account/support` and view its detail page at
`/account/support/[caseNumber]`.

## Access and disclosure boundary

- The database lookup combines the normalized case number and the signed-in user's exact user ID.
  A missing case and a case owned by another account both return the same not-found response.
- The page is read-only. It cannot close, reopen, reassign, review, or otherwise mutate a case.
- Timeline entries expose only a customer-safe label derived from the event action and the recorded
  timestamp. Raw event summaries, event identifiers, actor identities, reviewer identities, and
  other operator metadata are not returned to the page.
- Unknown event actions appear as `Update recorded`. Unknown case statuses and categories use safe
  public fallback labels.
- The resolution uses only the case's existing customer-visible `resolutionNote` field. Event text
  is never used as a resolution source.

## Bounds and presentation

The case-number route parameter must match the generated `MTCC-YYYYMMDD-XXXXXXXX` format. The
timeline query retrieves at most 101 records in deterministic newest-first order and shows the 100
most recent in chronological order. When older events exist, the page states that the view is
truncated. Loading, error, empty-timeline, narrow-screen, and keyboard-visible link states reuse the
portal's existing accessible components and styles.

This feature does not modify payment, refund, booking, supplier, inventory, or Cashfree behavior.
