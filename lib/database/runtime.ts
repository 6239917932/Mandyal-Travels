import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

import { PrismaClient } from '../../generated/prisma/client.ts';
import { PrismaClient as PostgreSqlPrismaClient } from '../../generated/prisma-postgresql/client.ts';

export type DatabaseRuntimeProvider = 'postgresql' | 'sqlite';

export interface DatabasePoolConfiguration {
  connectionTimeoutMillis: number;
  max: number;
  statementTimeoutMillis: number;
}

const DEFAULT_POOL_CONFIGURATION: DatabasePoolConfiguration = {
  connectionTimeoutMillis: 10_000,
  max: 10,
  statementTimeoutMillis: 30_000,
};

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  if (!/^\d+$/.test(value)) throw new Error(`${name}_INVALID`);
  const parsed = Number.parseInt(value, 10);
  if (parsed < minimum || parsed > maximum) throw new Error(`${name}_INVALID`);
  return parsed;
}

export function resolveDatabaseRuntimeProvider(databaseUrl: string): DatabaseRuntimeProvider {
  const normalized = databaseUrl.trim().toLowerCase();
  if (normalized.startsWith('file:')) return 'sqlite';
  if (normalized.startsWith('postgresql:') || normalized.startsWith('postgres:')) {
    return 'postgresql';
  }
  throw new Error('DATABASE_URL_PROVIDER_UNSUPPORTED');
}

export function resolveDatabasePoolConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): DatabasePoolConfiguration {
  return {
    connectionTimeoutMillis: boundedInteger(
      environment.DATABASE_CONNECT_TIMEOUT_MS,
      DEFAULT_POOL_CONFIGURATION.connectionTimeoutMillis,
      1_000,
      60_000,
      'DATABASE_CONNECT_TIMEOUT_MS',
    ),
    max: boundedInteger(
      environment.DATABASE_POOL_MAX,
      DEFAULT_POOL_CONFIGURATION.max,
      1,
      50,
      'DATABASE_POOL_MAX',
    ),
    statementTimeoutMillis: boundedInteger(
      environment.DATABASE_STATEMENT_TIMEOUT_MS,
      DEFAULT_POOL_CONFIGURATION.statementTimeoutMillis,
      1_000,
      120_000,
      'DATABASE_STATEMENT_TIMEOUT_MS',
    ),
  };
}

export function validatePostgreSqlRuntimeUrl(databaseUrl: string, production: boolean): URL {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL_INVALID');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL_PROVIDER_UNSUPPORTED');
  }
  if (!parsed.username || !parsed.hostname || parsed.pathname === '/') {
    throw new Error('DATABASE_URL_INCOMPLETE');
  }
  if (production) {
    const sslMode = parsed.searchParams.get('sslmode');
    if (!['require', 'verify-ca', 'verify-full'].includes(sslMode ?? '')) {
      throw new Error('DATABASE_URL_TLS_REQUIRED');
    }
  }
  return parsed;
}

export function createDatabaseClient(
  databaseUrl: string,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): PrismaClient {
  const provider = resolveDatabaseRuntimeProvider(databaseUrl);
  if (provider === 'sqlite') {
    return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl }) });
  }

  validatePostgreSqlRuntimeUrl(databaseUrl, environment.NODE_ENV === 'production');
  const pool = resolveDatabasePoolConfiguration(environment);
  const postgresqlClient = new PostgreSqlPrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
      connectionTimeoutMillis: pool.connectionTimeoutMillis,
      max: pool.max,
      statement_timeout: pool.statementTimeoutMillis,
    }),
  });

  // Both clients are generated from the same canonical model contract. The PostgreSQL
  // schema parity verifier fails CI before this boundary can drift.
  return postgresqlClient as unknown as PrismaClient;
}
