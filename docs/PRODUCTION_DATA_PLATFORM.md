# Production relational data platform handoff

## Current and target state

SQLite remains the deterministic local-development and clean-migration verification engine. It is not approved for production. The production target is a managed, multi-availability-zone PostgreSQL service with encrypted storage, TLS connections, automated point-in-time recovery, query monitoring, connection pooling, and separate development, staging, and production instances.

Release validation rejects `file:` database URLs and requires a PostgreSQL URL. This is an intentional deployment gate: the portal must not be launched against the local database accidentally.

The repository also materializes a provider-neutral PostgreSQL contract from the canonical SQLite
Prisma model. `prisma/postgresql/schema.prisma` and its 72-table native baseline are generated files
that are committed for review. `npm run db:verify:postgresql` regenerates the contract in memory,
validates and generates its Prisma Client, and rejects schema or baseline drift without connecting to
a database. This closes the schema-portability gap; it does not activate a production database.

## Provider activation checklist

1. Select the cloud region and managed PostgreSQL provider through infrastructure and data-residency review.
2. Provision private networking, TLS, least-privilege application and migration identities, connection pooling, backups, PITR, maintenance windows, monitoring, and alerts.
3. Add `@prisma/adapter-pg`, `pg`, and the reviewed lockfile in a dedicated dependency change. Wire the
   production runtime to the approved connection pool while retaining the SQLite development profile.
4. Review the committed PostgreSQL schema and native baseline against the provisioned engine. Deploy
   it only to a new empty database with `npm run db:deploy:postgresql`. Existing SQLite migration SQL
   must not be replayed against PostgreSQL.
5. Restore a masked production-like rehearsal dataset, reconcile row counts and foreign keys, execute load/failover/restore tests, and record timings.
6. Freeze writes, take a verified source backup, migrate and reconcile, rotate credentials, then enable traffic through a reversible cutover plan.

The database URL and credentials belong in the deployment secret manager. They must never be placed in `.env.example`, CI logs, tickets, or source control. Provider selection, commercial approval, production credentials, and the cutover window are external prerequisites and are deliberately not fabricated by this repository.

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
