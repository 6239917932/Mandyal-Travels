import { isIP } from 'node:net';

const HOST_PATTERN = /^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)*[a-z0-9][a-z0-9-]{0,62}$/;

function isPublicDomainName(host: string): boolean {
  return (
    HOST_PATTERN.test(host) &&
    host.includes('.') &&
    !host.includes('..') &&
    host !== 'localhost' &&
    !host.endsWith('.localhost') &&
    !host.endsWith('.local') &&
    isIP(host) === 0
  );
}

export function parseAllowedProviderHosts(value: string | undefined): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(',')
        .map((host) => host.trim().toLowerCase().replace(/\.$/, ''))
        .filter(isPublicDomainName),
    ),
  ];
}

export function isAllowedProviderEndpoint(value: string, allowedHosts: readonly string[]): boolean {
  try {
    const endpoint = new URL(value);
    const hostname = endpoint.hostname.toLowerCase().replace(/\.$/, '');
    if (
      endpoint.protocol !== 'https:' ||
      endpoint.username ||
      endpoint.password ||
      (endpoint.port && endpoint.port !== '443') ||
      !isPublicDomainName(hostname)
    )
      return false;
    return parseAllowedProviderHosts(allowedHosts.join(',')).some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}
