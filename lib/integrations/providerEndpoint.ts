const PRIVATE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function isAllowedProviderEndpoint(value: string, allowedHosts: readonly string[]): boolean {
  try {
    const endpoint = new URL(value);
    if (endpoint.protocol !== 'https:' || PRIVATE_HOSTS.has(endpoint.hostname)) return false;
    return allowedHosts.some(
      (host) => endpoint.hostname === host || endpoint.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}
