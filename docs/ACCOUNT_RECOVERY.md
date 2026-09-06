# Account recovery activation

The portal provides account-neutral forgotten-password requests and a single-use reset flow. Public
registration cannot create `PLATFORM_ADMIN`; platform access remains an explicit CLI provisioning
step documented in the repository README.

## Security contract

- Reset secrets contain 256 bits of randomness and only their SHA-256 hashes are stored.
- A link expires after 30 minutes, is atomically claimed once, and invalidates all other links for
  that account.
- Completing a reset revokes all active browser sessions and records a security event.
- Request responses do not disclose whether an email is registered. Email delivery runs after the
  response to avoid coupling response time to provider latency.
- The raw secret is carried in the URL fragment, removed from browser history after hydration, and
  never placed in notification tables, application logs, or database fields.
- Request and confirmation attempts have independent account/IP-scoped rate limits.

## Production activation

Configure `PUBLIC_APP_ORIGIN` as the canonical HTTPS portal origin and configure the provider-neutral
email variables documented in `.env.example`: `EMAIL_PROVIDER_ENDPOINT`, `EMAIL_PROVIDER_API_KEY`,
`EMAIL_PROVIDER_ALLOWED_HOSTS`, and `EMAIL_FROM_ADDRESS`. The endpoint must be on the explicit HTTPS
allow-list and return a bounded provider message identifier.

The deployment runtime must support Next.js `after` work. The prepared Node.js and container
runtimes do; a custom serverless adapter must provide the documented `waitUntil` integration.

Titan or another SMTP mailbox can be used instead of the provider-neutral HTTP adapter by setting
`EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD`,
`EMAIL_SMTP_ALLOWED_HOSTS`, and `EMAIL_FROM_ADDRESS` in the deployment secret manager. After a
delivery test succeeds, set `AUTH_EMAIL_OTP_REQUIRED=true` to require a six-digit email code during
registration and every password-based sign-in. Do not enable the flag before delivery is verified;
an unavailable provider would correctly block authentication.

Before launch, verify:

1. Known and unknown emails receive indistinguishable HTTP 202 responses.
2. A delivered link works once before expiry and fails after use or expiry.
3. Reset completion invalidates existing sessions on every device.
4. Provider failures do not leave usable orphan tokens and do not expose account existence.
5. Email content, sender identity, deliverability, abuse monitoring, and support escalation are
   approved by operations and security owners.
