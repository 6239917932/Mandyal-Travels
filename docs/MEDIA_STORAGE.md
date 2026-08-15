# Production media storage contract

Property and room images use a provider-neutral signing-service contract. The portal validates content type, extension, and a 12 MB size limit before requesting a short-lived upload intent. The signer must isolate every partner namespace, generate non-guessable object keys, enforce exact content length/type, strip metadata, decode the image, malware-scan it, and expose the public URL only after scanning succeeds.

Configure `MEDIA_SIGNING_ENDPOINT` and `MEDIA_SIGNING_API_KEY` through the production secret manager. The signer response contains `uploadUrl`, `publicUrl`, `expiresAt`, and optional required headers. Upload URLs must expire within 15 minutes; public objects must be immutable and CDN cached using versioned keys. Original filenames are display metadata only and must never form an object path.

Provider selection, bucket/CDN provisioning, lifecycle classes, residency, moderation policy, and credentials are external prerequisites. Until configured, the API returns a deliberate 503 and existing HTTPS image URLs continue to work; it never pretends that an upload succeeded.
