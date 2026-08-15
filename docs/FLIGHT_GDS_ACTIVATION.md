# Airline and GDS activation

Flight supplier connections and idempotent operation records are implemented with credential references, environment separation, health checks, bounded retries, correlation IDs, and auditability. Provider network endpoints must use HTTPS and an explicit host allow-list.

Production activation still requires a signed airline/GDS agreement, agency identifiers, ticketing authority, settlement/BSP or equivalent arrangements, certified shopping/pricing/order/ticket/refund flows, production credentials, webhook or queue security, schedule-change servicing, and 24-hour escalation ownership. Fixture offers remain development-only and must be disabled before a live release.
