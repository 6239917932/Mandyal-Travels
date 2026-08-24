# Customer servicing requests

`/account/support` is an authenticated, read-only case history plus a bounded intake form. Customers
can search their own case number, booking reference, or subject and filter only the public `OPEN`
and `CLOSED` states. The result window is 20 cases per page and never exposes more than 500 matching
records in one browsing view.

Support creation accepts only the closed Account, Booking, Payment, Technical, and Other categories.
General help is available with or without a booking. Change and cancellation intents require an
owned Flight, Bus, or Car trip reference. They create a request for human review only: submission
does not change availability, inventory, a booking, payment, or refund and does not guarantee an
outcome.

Booking ownership is resolved in the same database transaction that creates the case. A transport
trip must already belong to the signed-in user, or be an unclaimed legacy trip whose normalized
email exactly matches the signed-in email; a successful legacy match is claimed conditionally in
that transaction. Hotel ownership uses the booking guest's exact normalized email. Ambiguous or
unowned references fail closed. Case creation and its append-only `CREATED` event commit together.

The customer list returns only the case number, safe category/status labels, the customer's subject
and message, optional booking reference, timestamps, and the explicitly customer-facing resolution
note. It never projects reviewer or actor identifiers, raw event summaries, provider fields, payment
fields, or internal operational status. The detail timeline remains available from every result and
continues to derive public event labels from its closed action catalogue.

The mutation requires same-origin browser evidence, an authenticated active session, an 8 KiB JSON
body cap, bounded fields, and the existing per-user request rate limit. Cashfree and every payment or
refund mutation are outside this workflow.
