# SMS and WhatsApp activation

SMS and WhatsApp reuse the governed notification queue, templates, deduplication, retries, and operational review. The server-only adapter supports approved senders and provider template identifiers through an allow-listed HTTPS endpoint.

Production activation requires sender-ID and WhatsApp Business approval, country-specific DLT/telecom registration where applicable, explicit opt-in and opt-out handling, approved message templates, delivery/status webhooks, quiet-hour rules, number normalization, suppression lists, privacy review, rate limits, sandbox certification, and production credentials. Queued messages are not treated as delivered until provider acknowledgement is recorded.
