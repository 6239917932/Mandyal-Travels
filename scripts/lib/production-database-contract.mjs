const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{2,79}$/;
const PLACEHOLDER_PATTERN = /change-me|example|placeholder|replace|todo/i;
const TLS_MODES = new Set(['require', 'verify-ca', 'verify-full']);

function parsePostgreSqlUrl(value, name) {
  if (!value) throw new Error(`${name} is required.`);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL.`);
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(`${name} must use PostgreSQL.`);
  }
  if (!parsed.username || !parsed.password || !parsed.hostname || parsed.pathname === '/') {
    throw new Error(`${name} must contain a database, host, username, and password.`);
  }
  if (parsed.hash) throw new Error(`${name} must not contain a URL fragment.`);
  if (PLACEHOLDER_PATTERN.test(`${parsed.username}:${parsed.password}:${parsed.hostname}`)) {
    throw new Error(`${name} still contains placeholder connection values.`);
  }
  const sslMode = parsed.searchParams.get('sslmode');
  if (!TLS_MODES.has(sslMode ?? '')) {
    throw new Error(`${name} must require verified TLS with sslmode.`);
  }
  if (parsed.hostname === 'localhost') {
    throw new Error(`${name} must target the reviewed managed database host.`);
  }
  return parsed;
}

function requireIdentifier(environment, name, failures) {
  const value = (environment[name] ?? '').trim();
  if (!IDENTIFIER_PATTERN.test(value) || PLACEHOLDER_PATTERN.test(value)) {
    failures.push(`${name} must contain the approved production reference.`);
  }
}

export function validateProductionDatabaseContract(environment) {
  const failures = [];
  let runtimeUrl;
  let migrationUrl;

  try {
    runtimeUrl = parsePostgreSqlUrl(environment.DATABASE_URL, 'DATABASE_URL');
  } catch (error) {
    failures.push(error instanceof Error ? error.message : 'DATABASE_URL is invalid.');
  }
  try {
    migrationUrl = parsePostgreSqlUrl(environment.DIRECT_DATABASE_URL, 'DIRECT_DATABASE_URL');
  } catch (error) {
    failures.push(error instanceof Error ? error.message : 'DIRECT_DATABASE_URL is invalid.');
  }

  if (runtimeUrl && migrationUrl) {
    if (runtimeUrl.toString() === migrationUrl.toString()) {
      failures.push('Runtime and migration database URLs must use separate identities.');
    }
    if (runtimeUrl.username === migrationUrl.username) {
      failures.push('Runtime and migration database users must be different.');
    }
    if (['postgres', 'root', 'admin'].includes(runtimeUrl.username.toLowerCase())) {
      failures.push('The application runtime must not use an administrative database identity.');
    }
  }

  for (const name of [
    'DATABASE_PLATFORM_PROVIDER',
    'DATABASE_PLATFORM_REGION',
    'DATABASE_BACKUP_POLICY_ID',
    'DATABASE_CUTOVER_PLAN_ID',
    'DATABASE_RESTORE_EVIDENCE_ID',
  ]) {
    requireIdentifier(environment, name, failures);
  }
  if (environment.DATABASE_HIGH_AVAILABILITY !== 'true') {
    failures.push('DATABASE_HIGH_AVAILABILITY must be true.');
  }
  if (environment.DATABASE_PITR_ENABLED !== 'true') {
    failures.push('DATABASE_PITR_ENABLED must be true.');
  }

  return failures;
}
