# Transactional email activation

The notification queue, governed templates, deduplication, retry scheduling, and delivery administration are implemented. The email adapter sends provider-neutral HTTPS requests with idempotency keys and never exposes the provider API key to browsers.

Production activation requires domain ownership, SPF, DKIM, DMARC, approved sender identities, bounce/complaint webhooks, suppression handling, unsubscribe rules for non-transactional mail, regional/privacy review, sandbox tests, template approval, rate limits, and monitored production credentials. Until those external steps are complete, queued messages must not be described as delivered.
