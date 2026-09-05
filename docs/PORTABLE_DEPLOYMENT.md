# Portable deployment foundation

## Scope and safety boundary

The repository can now build a minimal Next.js standalone image and a separate one-shot migration
image. The web runtime is non-root, drops Linux capabilities in the supplied Compose profile, starts
only after migrations succeed, contains no committed environment file or local database, and exposes
separate process liveness and database readiness endpoints.

`compose.portable-preview.yaml` is a reproducible single-host preview for release rehearsals. Its
persistent SQLite volume is **not a production database architecture**. It must remain one application
replica and must not be used for a public, multi-instance, high-availability launch. The existing
production preflight intentionally rejects it.

## Build contract

- Node.js 22 on Debian provides the build and runtime ABI.
- The container builder sets `NEXT_OUTPUT_MODE=standalone`, causing `next.config.ts` to emit
  `.next/standalone`; the runtime image receives only the standalone server, public assets, and Next
  static assets. Normal local builds keep their existing `next start` output.
- `npm ci --ignore-scripts` prevents an incomplete dependency stage from running Prisma generation;
  the complete builder and migration stages generate the client after the schema is present.
- `/api/v1/health/live` confirms that the process can answer HTTP without touching a dependency.
- `/api/v1/health` is the readiness check and verifies the database, core schema, integration
  outbox, and any explicitly required Hotelbeds content cache. A disabled Hotelbeds content sync is
  reported as not required. Once enabled, missing credentials, an unapplied cache migration, an
  empty or stale cache, or an unsafe provider environment returns HTTP 503 without calling the
  supplier. A fresh cache remains usable during a running refresh or a recent failed refresh, but
  the response reports attention. Traffic must reach an instance only while this endpoint returns
  HTTP 200.
- `npm run deployment:verify` checks these invariants and is included in `npm run check`.

## Local preview rehearsal

Use unique development-only values with at least 32 characters. Never paste production credentials
into the command history or a Compose file. Set `BOOKING_TOKEN_SECRET`, `PARTNER_ADMIN_KEY`, and the
base64-encoded 32-byte `MFA_ENCRYPTION_KEY` through the local shell or an ignored local environment
file, then run:

```text
docker compose -f compose.portable-preview.yaml up --build
```

Confirm both endpoints:

```text
GET http://localhost:3000/api/v1/health/live
GET http://localhost:3000/api/v1/health
```

Stop the preview with `docker compose -f compose.portable-preview.yaml down`. Do not add `--volumes`
unless destruction of the preview database is explicitly intended and a useful database has first
been backed up.

## Production promotion gate

The portal still defaults locally to the SQLite Prisma client and SQLite migration history. A
reviewed, synchronized PostgreSQL schema, PostgreSQL runtime adapter, and 105-table native baseline
now exist, but a
real production release remains blocked even though the web artifact is portable. Complete the
reviewed steps in `docs/PRODUCTION_DATA_PLATFORM.md`: provision managed PostgreSQL, configure the
implemented runtime with the provisioned TLS connection details, rehearse and reconcile the data
transfer, verify restore/failover, and approve a reversible cutover window. Never replay the SQLite
migration files against PostgreSQL and never
silently change the working local database provider.

After that cutover is implemented, the release owner must also activate the approved secret store,
off-site backups, scheduler/worker, observability, TLS edge, and any finalized payment or supplier
providers. Run `npm run check` and `npm run release:verify-env` against the approved release
configuration before routing public traffic. Use `docs/PRODUCTION_RUNTIME_RUNBOOK.md` and
`compose.production-contract.yaml` as the workload and promotion contract; neither file provisions
the external services or authorizes a live release.
