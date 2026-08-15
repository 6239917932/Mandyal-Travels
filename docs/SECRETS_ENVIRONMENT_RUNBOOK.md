# Secrets and environment runbook

All provider credentials are referenced through server environment variables or secret references; no browser bundle, repository file, database note, or log may contain plaintext credentials. Use a managed secret store with separate values per environment, least-privilege runtime access, audit logging, rotation owners, expiry alerts, and break-glass recovery.

Before every release, run the environment verifier, scan the repository and build artifact for secrets, rotate any exposed value, validate callback origins, and record the approved configuration version without recording secret material.
