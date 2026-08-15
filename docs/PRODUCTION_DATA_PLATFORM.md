# Production relational data platform handoff

## Current and target state

SQLite remains the deterministic local-development and clean-migration verification engine. It is not approved for production. The production target is a managed, multi-availability-zone PostgreSQL service with encrypted storage, TLS connections, automated point-in-time recovery, query monitoring, connection pooling, and separate development, staging, and production instances.

Release validation rejects `file:` database URLs and requires a PostgreSQL URL. This is an intentional deployment gate: the portal must not be launched against the local database accidentally.

## Provider activation checklist

1. Select the cloud region and managed PostgreSQL provider through infrastructure and data-residency review.
2. Provision private networking, TLS, least-privilege application and migration identities, connection pooling, backups, PITR, maintenance windows, monitoring, and alerts.
3. Add the Prisma PostgreSQL driver adapter and lockfile in a dedicated reviewed dependency change. Switch the production Prisma datasource to PostgreSQL while retaining the SQLite development profile.
4. Generate a PostgreSQL-native baseline from the complete Prisma data model. Existing SQLite migration SQL must not be replayed against PostgreSQL.
5. Restore a masked production-like rehearsal dataset, reconcile row counts and foreign keys, execute load/failover/restore tests, and record timings.
6. Freeze writes, take a verified source backup, migrate and reconcile, rotate credentials, then enable traffic through a reversible cutover plan.

The database URL and credentials belong in the deployment secret manager. They must never be placed in `.env.example`, CI logs, tickets, or source control. Provider selection, commercial approval, production credentials, and the cutover window are external prerequisites and are deliberately not fabricated by this repository.
