# Production media storage contract

Property and room images use a provider-neutral signing-service contract. The portal validates content type, extension, and a 12 MB size limit before requesting a short-lived upload intent. The signer must isolate every partner namespace, generate non-guessable object keys, enforce exact content length/type, strip metadata, decode the image, malware-scan it, and expose the public URL only after scanning succeeds.

Configure `MEDIA_SIGNING_ENDPOINT`, `MEDIA_SIGNING_API_KEY`, and `MEDIA_PROVIDER_ALLOWED_HOSTS` through the production secret manager. The allow-list is a comma-separated set containing only the contracted signer, upload, and CDN domains. The signer response contains `uploadUrl`, `publicUrl`, `expiresAt`, and optional required headers. The portal rejects non-HTTPS or non-allowlisted URLs, malformed headers, and upload intents that are already expired or live longer than 15 minutes. Public objects must be immutable and CDN cached using versioned keys. Original filenames are display metadata only and must never form an object path.

Provider selection, bucket/CDN provisioning, lifecycle classes, residency, moderation policy, and credentials are external prerequisites. Until configured, the API returns a deliberate 503 and existing HTTPS image URLs continue to work; it never pretends that an upload succeeded.
