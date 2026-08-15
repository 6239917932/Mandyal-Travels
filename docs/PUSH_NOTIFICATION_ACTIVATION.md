# Push notification activation

Push messages use the governed notification pipeline and a server-only, provider-neutral HTTPS adapter. Payloads are bounded to a title, body, optional application deep link, and opaque device token; provider credentials never reach clients.

Live activation requires Android/iOS application identifiers, APNs and FCM credentials, device-token registration and rotation, explicit notification permission, preference and quiet-hour enforcement, invalid-token suppression, delivery metrics, sandbox certification, credential rotation, and mobile deep-link testing. Provider acknowledgement must be recorded before delivery is considered successful.
