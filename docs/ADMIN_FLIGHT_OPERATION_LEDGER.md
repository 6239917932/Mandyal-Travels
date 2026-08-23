# Administrator flight supplier operation ledger

The protected `/admin/integrations/flights` route gives platform administrators a bounded,
read-only trace of flight supplier health operations. It supports 100-character search, closed
status and environment filters, a 1,000-record query ceiling, and 25-record pagination.

The ledger shows supplier ownership, operation type, correlation ID, status, attempt count, timing,
and whether provider acknowledgement or error evidence exists. It never renders credential
references, request hashes, provider references, or error contents. Those values remain server-side
integration evidence.

Queued health operations are expected until a contracted supplier is approved, certified, and its
worker is activated. The page does not execute network requests, retry operations, change connection
state, simulate provider success, modify payments, or configure Cashfree.
