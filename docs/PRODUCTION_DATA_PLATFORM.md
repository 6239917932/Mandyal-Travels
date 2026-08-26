# Production relational data platform handoff

## Current and target state

SQLite remains the deterministic local-development and clean-migration verification engine. It is not approved for production. The production target is a managed, multi-availability-zone PostgreSQL service with encrypted storage, TLS connections, automated point-in-time recovery, query monitoring, connection pooling, and separate development, staging, and production instances.

Release validation rejects `file:` database URLs and requires a PostgreSQL URL. This is an intentional deployment gate: the portal must not be launched against the local database accidentally.

The repository also materializes a provider-neutral PostgreSQL contract from the canonical SQLite
Prisma model. `prisma/postgresql/schema.prisma` and its 85-table native baseline are generated files
that are committed for review. `npm run db:verify:postgresql` regenerates the contract in memory,
validates and generates its Prisma Client, and rejects schema or baseline drift without connecting to
a database. This closes the schema-portability gap; it does not activate a production database.

## Provider activation checklist

1. Select the cloud region and managed PostgreSQL provider through infrastructure and data-residency review.
2. Provision private networking, TLS, least-privilege application and migration identities, connection pooling, backups, PITR, maintenance windows, monitoring, and alerts.
3. Configure the implemented `@prisma/adapter-pg` runtime with the least-privilege pooled
   `DATABASE_URL`; retain SQLite only for the local development profile. Use a separate
   `DIRECT_DATABASE_URL` migration identity. Both production URLs require an explicit TLS mode.
4. Review the committed PostgreSQL schema and native baseline against the provisioned engine. Deploy
   it only to a new empty database with `npm run db:deploy:postgresql`. Existing SQLite migration SQL
   must not be replayed against PostgreSQL.
5. Restore a masked production-like rehearsal dataset, then use
   `npm run db:rehearse:postgresql -- --mode=reconcile` to compare all canonical table counts and
   critical finance aggregates. Execute load/failover/restore tests and record timings.
6. Freeze writes, take a verified source backup, migrate and reconcile, rotate credentials, then enable traffic through a reversible cutover plan.

The database URL and credentials belong in the deployment secret manager. They must never be placed in `.env.example`, CI logs, tickets, or source control. Provider selection, commercial approval, production credentials, and the cutover window are external prerequisites and are deliberately not fabricated by this repository.

## Implemented runtime and rehearsal controls

- `npm run db:generate` produces synchronized SQLite and PostgreSQL clients from the canonical model.
- The application selects SQLite only for a `file:` URL and PostgreSQL only for a `postgres:` or
  `postgresql:` URL. Production PostgreSQL requires `sslmode=require`, `verify-ca`, or `verify-full`.
- Pool size, connection timeout, and statement timeout are bounded by `DATABASE_POOL_MAX`,
  `DATABASE_CONNECT_TIMEOUT_MS`, and `DATABASE_STATEMENT_TIMEOUT_MS`.
- `npm run release:verify-env` requires separate runtime/migration identities, managed-platform and
  region references, high availability, point-in-time recovery, backup policy, cutover plan, and
  independently recorded restore evidence.
- The cutover verifier is read-only. `--mode=preflight` requires a migrated but empty target;
  `--mode=reconcile` compares the populated target with the SQLite source; and `--mode=restore`
  checks an independently restored PostgreSQL database through `RESTORE_DATABASE_URL`.
- Set `SOURCE_DATABASE_URL` to the reviewed SQLite snapshot and optionally set
  `CUTOVER_EVIDENCE_PATH` to create a new non-sensitive JSON evidence record. Existing evidence is
  never overwritten.
- A successful isolated `--mode=restore` rehearsal may additionally report a safe summary to the
  deployed portal when `RECOVERY_EVIDENCE_REPORT_ORIGIN` and the secret-managed
  `AUTOPILOT_WORKER_SECRET` are configured. The portal rejects stale, mismatched, replay-conflicting,
  or non-restore evidence and retains no credentials, record contents, or finance values.

The verifier intentionally does not copy records, freeze writes, deploy infrastructure, or promote
traffic. Those actions require the approved provider tooling, a reviewed transfer method, named
operators, a maintenance window, and rollback authority.

## Schema maintenance contract

After every reviewed change to `prisma/schema.prisma`, run:

```text
npm run db:sync:postgresql
npm run db:verify:postgresql
```

Review both generated PostgreSQL files before committing them. CI runs the verifier through
`npm run check`, so a SQLite model change cannot merge while its PostgreSQL schema or baseline is
stale. `DIRECT_DATABASE_URL` is reserved for the least-privilege migration identity and is required
only by `npm run db:deploy:postgresql`; the verifier intentionally uses a non-secret placeholder URL
and its validate, generate, and migration-diff operations never open a database connection.
