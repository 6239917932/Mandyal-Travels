# Flight supplier operations handoff

Flight suppliers can register sandbox or production connections using secret-manager references; credential values never enter the database. Health checks and later shopping/order operations are idempotent, correlated, auditable queue records with request hashes rather than raw passenger or provider payloads.

Live search, repricing, order creation, ticketing, cancellation, queues, certification, PCC/office IDs, fare rules, settlement plans, and production credentials require a signed airline/GDS/NDC agreement. Those provider-specific adapters are activated in serial priorities 21 and 23. Until then health requests remain queued and explicitly return `providerActivationRequired`; the portal does not simulate provider success.
