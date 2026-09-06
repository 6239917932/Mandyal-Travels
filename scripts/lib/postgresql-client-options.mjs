const RAILWAY_PRIVATE_SUFFIX = '.railway.internal';

export function postgreSqlClientOptions(databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (!parsed.hostname.endsWith(RAILWAY_PRIVATE_SUFFIX)) {
    return { connectionString: databaseUrl };
  }

  // Railway's managed PostgreSQL service uses a self-signed certificate on its
  // project-isolated private network. Keep the connection encrypted, but scope
  // the certificate exception strictly to Railway's non-public DNS namespace.
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('uselibpqcompat');
  return {
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: false },
  };
}
