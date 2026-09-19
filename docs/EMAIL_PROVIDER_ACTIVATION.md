# Transactional email activation

The notification queue, governed templates, deduplication, retry scheduling, delivery administration, authenticated bounce/complaint intake, replay protection, and suppression enforcement are implemented. The email adapter sends provider-neutral HTTPS requests with idempotency keys and never exposes the provider API key to browsers.

Production activation still requires domain ownership, SPF, DKIM, DMARC, approved sender identities, provider webhook mapping, unsubscribe rules for non-transactional mail, regional/privacy review, sandbox tests, template approval, rate limits, and monitored production credentials. Until those external steps are complete, queued messages must not be described as delivered.

## Bounce and complaint adapter contract

Configure a provider-specific adapter to send normalized events to:

`POST /api/v1/notifications/email-events/{provider}`

The request must use `Content-Type: application/json` and include:

- `x-email-event-timestamp`: current Unix time in seconds.
- `x-email-event-signature`: lowercase hex HMAC-SHA256 of `{timestamp}.{provider}.{rawBody}` using `EMAIL_BOUNCE_WEBHOOK_SECRET`. The provider is the exact URL path segment. A `sha256=` prefix is accepted. Binding the provider prevents replaying a signed event under a different provider name.

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

`type` must be `BOUNCE` or `COMPLAINT`. Events are idempotent by provider and event ID; reusing an ID with a different payload returns 409. Event recording and suppression updates commit together. Delayed bounces cannot erase a recorded complaint or move the latest observation backwards. The platform stores a keyed recipient hash rather than the mailbox address and records a payload hash for audit. On its next delivery attempt, the notification worker dead-letters a suppressed address before calling the provider. This control covers queued notifications; direct authentication OTP sends are outside this worker.

Use two separate random secrets of at least 32 characters:

- `EMAIL_BOUNCE_WEBHOOK_SECRET` authenticates the normalized event request.
- `EMAIL_SUPPRESSION_HASH_SECRET` creates stable privacy-preserving recipient identifiers. Rotating this secret requires a controlled suppression-data migration; an unplanned rotation would make earlier suppressions undiscoverable.

Provider-native event names, signatures, retries, and payloads differ. The provider adapter must verify the native webhook first, translate only permanent bounces and complaints into this contract, and preserve the native event ID for replay protection. Soft/transient bounces should remain in provider retry handling and must not be translated into permanent suppressions without an approved policy.

## Deployment sequence

Install both secrets on the application and notification-worker services before deploying this change. Do not replace an existing suppression hash secret. With no valid hash secret, queued email attempts fail closed and eventually reach the dead-letter queue; deploying before configuration would interrupt existing notification delivery. Verify the secrets by presence and length without printing their values, then deploy the migration and application, and exercise signed bounce, complaint, duplicate, and suppressed-send cases in a test environment. Configure and certify the provider adapter before marking email deliverability ready.
