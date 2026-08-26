# Production runtime runbook

## Scope and external activation boundary

`compose.production-contract.yaml` is the provider-neutral process contract for the portal release.
It defines the migration, web, and notification-delivery workloads without pretending to provision a
cloud account, managed PostgreSQL, TLS edge, secret manager, scheduler, log platform, or backup
service. A release owner must select and configure those external services before launch.

This contract is suitable as a reference for a container platform or a controlled single-host
rehearsal. It must not be exposed directly to the internet. Terminate TLS at an approved edge, route
traffic only to healthy web instances, and keep the migration and scheduled-job workloads private.

## Workload contract

| Workload                | Lifecycle                 | Purpose                                                                                |
| ----------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `migrate`               | one shot, before web      | Applies the reviewed native PostgreSQL migration history over a direct TLS connection. |
| `app`                   | long running, replaceable | Runs the immutable standalone Next.js web artifact as a non-root user.                 |
| `notification-delivery` | one shot, scheduler-owned | Performs one bounded, authenticated notification delivery pass.                        |
| `safe-maintenance`      | one shot, scheduler-owned | Expires stale holds and reservations under a database lease with run evidence.         |

The web workload cannot start until the migration workload succeeds. A failed migration blocks the
release; never bypass it, mark it successful manually, or run SQLite migrations against PostgreSQL.
All workloads drop Linux capabilities, prevent privilege escalation, use a read-only root filesystem,
and receive a bounded temporary filesystem. The web image contains no default database URL, so a
missing production database configuration fails closed instead of silently creating SQLite state.

## Required platform configuration

1. Inject `DATABASE_URL` as the pooled TLS PostgreSQL runtime URL and `DIRECT_DATABASE_URL` as the
   direct TLS migration URL from the approved secret manager. Follow
   `docs/PRODUCTION_DATA_PLATFORM.md` for cutover and reconciliation.
2. Inject `BOOKING_TOKEN_SECRET`, `MFA_ENCRYPTION_KEY`, `PARTNER_ADMIN_KEY`, and
   `NOTIFICATION_WORKER_SECRET`, and `AUTOPILOT_WORKER_SECRET` as independently generated production
   values. Do not store them in a
   Compose file, image, CI log, or operator note.
3. Set `PUBLIC_APP_ORIGIN` to the canonical HTTPS origin, `DEPLOYMENT_ENVIRONMENT=production`, and
   `RELEASE_SHA` to an immutable source revision.
4. Supply the remaining approved provider settings through the same secret/configuration system.
   `npm run release:verify-env` is the final fail-closed check after payment and payout providers have
   been approved; this runtime contract does not choose or enable either provider.
5. Configure the edge to probe `/api/v1/health/live` for process liveness and `/api/v1/health` for
   dependency readiness. Remove an instance from traffic immediately when readiness is not HTTP 200.

## Release sequence

1. Build the `runner`, `operations`, and `worker` targets from one reviewed commit and record their
   immutable image digest.
2. Run `npm run check`, the secret scan, and `npm run release:verify-env` using secret references.
3. Back up the current database and verify that the restore evidence is current.
4. Run the `migrate` workload once. Preserve its exit status and migration evidence.
5. Roll out the `app` workload gradually. Require readiness success before traffic and keep the prior
   image available for rollback.
6. Run non-production `notification-delivery` and `safe-maintenance` passes, verify structured events,
   lease/run evidence, and delivery state, then enable the production schedules.
7. Complete the synthetic monitoring and alert checks in `docs/OBSERVABILITY_RUNBOOK.md` before
   declaring the release healthy.

## Scheduler contract

Invoke the one-shot job with the platform's authenticated scheduler, for example by running the
`notification-delivery` service under the `scheduled-jobs` profile. Do not run it continuously inside
the web process. Configure a single active invocation, a timeout longer than
`NOTIFICATION_WORKER_TIMEOUT_MS`, bounded retries with backoff, alerting on every terminal failure,
and a documented manual replay owner. The worker endpoint and script enforce their own secret,
timeout, and batch limits; scheduler controls are still required.

## Rollback and incident handling

- Application rollback: stop routing to the new image and restore the prior immutable image. Do not
  reverse a migration until its reviewed down/recovery procedure has been tested.
- Migration failure: keep the new web release stopped, preserve logs and database evidence, and use
  the documented restore/cutover decision path. Never edit migration history in production.
- Readiness failure: remove the instance from service, correlate the structured health event with the
  release SHA, and inspect database and integration-outbox status.
- Worker failure: stop further scheduled attempts when repeated retries risk duplicate provider
  calls, retain the correlation evidence, and follow the idempotent replay procedure.

Live deployment remains blocked until the external infrastructure, provider credentials, monitoring,
backup evidence, and release authority are supplied and reviewed.
