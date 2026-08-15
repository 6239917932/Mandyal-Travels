# Secrets and environment runbook

All provider credentials are referenced through server environment variables or secret references; no browser bundle, repository file, database note, or log may contain plaintext credentials. Use a managed secret store with separate values per environment, least-privilege runtime access, audit logging, rotation owners, expiry alerts, and break-glass recovery.

Before every release, run the environment verifier, scan the repository and build artifact for secrets, rotate any exposed value, validate callback origins, and record the approved configuration version without recording secret material.

Every outbound provider endpoint must also have a corresponding comma-separated host allow-list. The runtime rejects HTTPS endpoints, redirects, upload URLs, and checkout URLs whose host is absent from that list. Review these allow-lists during provider onboarding and credential rotation; never populate them dynamically from an incoming URL.
