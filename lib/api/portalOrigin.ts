function addOrigin(origins: Set<string>, value: string | null | undefined) {
  if (!value) return;
  try {
    origins.add(new URL(value).origin);
  } catch {
    // Ignore malformed proxy or environment values and keep the request blocked.
  }
}

function addForwardedOrigin(origins: Set<string>, protocol: string, hostValue: string | null) {
  const host = hostValue?.split(',')[0]?.trim();
  if (!host || /[\s/@\\]/.test(host)) return;
  addOrigin(origins, `${protocol}//${host}`);
}

function addCanonicalAliases(origins: Set<string>, canonicalOrigin?: string) {
  if (!canonicalOrigin) return;
  try {
    const canonical = new URL(canonicalOrigin);
    origins.add(canonical.origin);
    const alias = new URL(canonical.origin);
    alias.hostname = canonical.hostname.startsWith('www.')
      ? canonical.hostname.slice(4)
      : `www.${canonical.hostname}`;
    origins.add(alias.origin);
  } catch {
    // Production startup validates PUBLIC_APP_ORIGIN separately.
  }
}

export function isTrustedPortalMutation(request: Request, canonicalOrigin?: string): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return false;

  const origin = request.headers.get('origin');
  if (!origin) return fetchSite === 'same-origin' || fetchSite === 'same-site';

  let protocol: string;
  try {
    protocol = `${request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || new URL(request.url).protocol.replace(':', '')}:`;
  } catch {
    return false;
  }

  const trustedOrigins = new Set<string>();
  addOrigin(trustedOrigins, request.url);
  addForwardedOrigin(trustedOrigins, protocol, request.headers.get('host'));
  addForwardedOrigin(trustedOrigins, protocol, request.headers.get('x-forwarded-host'));
  addCanonicalAliases(trustedOrigins, canonicalOrigin);

  try {
    return trustedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}
