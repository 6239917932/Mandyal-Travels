# Transactional email activation

The notification queue, governed templates, deduplication, retry scheduling, delivery administration, authenticated bounce/complaint intake, replay protection, and suppression enforcement are implemented. The email adapter sends provider-neutral HTTPS requests with idempotency keys and never exposes the provider API key to browsers.

Production activation still requires domain ownership, SPF, DKIM, DMARC, approved sender identities, provider webhook mapping, unsubscribe rules for non-transactional mail, regional/privacy review, sandbox tests, template approval, rate limits, and monitored production credentials. Until those external steps are complete, queued messages must not be described as delivered.

## Bounce and complaint adapter contract

Configure a provider-specific adapter to send normalized events to:

`POST /api/v1/notifications/email-events/{provider}`

The request must use `Content-Type: application/json` and include:

- `x-email-event-timestamp`: current Unix time in seconds.
- `x-email-event-signature`: lowercase hex HMAC-SHA256 of `{timestamp}.{rawBody}` using `EMAIL_BOUNCE_WEBHOOK_SECRET`. A `sha256=` prefix is accepted.

The JSON body is bounded to 64 KiB and must contain:

```json
{
  "eventId": "provider-event-id",
  "type": "BOUNCE",
  "recipient": "guest@example.com",
  "providerMessageId": "optional-provider-message-id",
  "occurredAt": "2026-09-14T10:00:00.000Z"
}
```

`type` must be `BOUNCE` or `COMPLAINT`. Events are idempotent by provider and event ID. The platform stores a keyed recipient hash rather than the mailbox address, records a payload hash for audit, and immediately dead-letters any queued email addressed to a suppressed recipient without calling the provider.

Use two separate random secrets of at least 32 characters:

- `EMAIL_BOUNCE_WEBHOOK_SECRET` authenticates the normalized event request.
- `EMAIL_SUPPRESSION_HASH_SECRET` creates stable privacy-preserving recipient identifiers. Rotating this secret requires a controlled suppression-data migration; an unplanned rotation would make earlier suppressions undiscoverable.

Provider-native event names, signatures, retries, and payloads differ. The provider adapter must verify the native webhook first, translate only permanent bounces and complaints into this contract, and preserve the native event ID for replay protection. Soft/transient bounces should remain in provider retry handling and must not be translated into permanent suppressions without an approved policy.
