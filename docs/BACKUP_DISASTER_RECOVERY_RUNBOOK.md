# Backup and disaster recovery runbook

The repository includes bounded local database backup tooling for development. Production requires provider-native encrypted database backups, point-in-time recovery where supported, object-storage versioning, configuration/export backups, cross-failure-domain copies, restricted restore access, retention enforcement, and backup-age alerts.

Define RPO/RTO targets, service dependencies, incident roles, customer communication, failover/rollback steps, and data-integrity verification. Perform scheduled restore drills into an isolated environment and record evidence; an untested backup is not considered recoverable.
