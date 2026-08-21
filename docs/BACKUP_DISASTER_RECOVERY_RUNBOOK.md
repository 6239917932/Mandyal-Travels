# Backup and disaster recovery runbook

The repository includes bounded SQLite backup and isolated restore-verification tooling for development and disaster-recovery rehearsals. Production must additionally use provider-native encrypted backups, point-in-time recovery where supported, object-storage versioning, cross-failure-domain copies, restricted restore access, and retention enforcement.

## Local evidence workflow

1. Stop or quiesce write-heavy local workflows.
2. Run `npm run db:backup`.
3. Run `npm run db:verify-backup`.
4. Retain the JSON verification output with the drill record.

The verifier checks the SHA-256 sidecar before copying the backup into an isolated operating-system temporary directory. It then runs SQLite integrity and foreign-key checks and confirms the core migration, user, and booking tables. The temporary restored database is removed after verification; the source backup is never mutated.

To verify a specific backup, set `BACKUP_VERIFY_PATH` to its project-relative or absolute path. `DATABASE_BACKUP_DIRECTORY` selects the backup directory and `DATABASE_BACKUP_RETENTION` controls the bounded local retention count.

## Production recovery contract

- Define and approve recovery-point and recovery-time objectives.
- Alert when the newest successful and verified backup is older than 25 hours.
- Restore into an isolated environment; never test a restore over the active database.
- Validate schema migrations, integrity, foreign keys, record counts, payment ledger balances, and booking availability before cutover.
- Record the operator, backup identifier, checksum, start/end times, findings, and approval.
- Exercise the process on a schedule and after material schema/provider changes.

An unverified backup is not considered recoverable.
