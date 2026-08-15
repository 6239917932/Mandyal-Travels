const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function resolvePublicPortalOrigin(
  configuredValue = process.env.PUBLIC_APP_ORIGIN,
  environment = process.env.NODE_ENV,
): string {
  const configured = configuredValue?.trim();
  if (!configured) {
    if (environment === 'production') throw new Error('PUBLIC_APP_ORIGIN_NOT_CONFIGURED');
    return 'http://localhost:3000';
  }

  try {
    const url = new URL(configured);
    const isLocalDevelopmentOrigin =
      environment !== 'production' && url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname);
    if (
      (url.protocol !== 'https:' && !isLocalDevelopmentOrigin) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error('PUBLIC_APP_ORIGIN_INVALID');
    }
    return url.origin;
  } catch (error) {
    if (error instanceof Error && error.message === 'PUBLIC_APP_ORIGIN_INVALID') throw error;
    throw new Error('PUBLIC_APP_ORIGIN_INVALID');
  }
}
