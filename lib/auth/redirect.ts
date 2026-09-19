export function getSafeReturnTo(value: unknown) {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\r\n\0]/.test(value)
  ) {
    return null;
  }
  return value;
}

export function getAccountHomePath(role: string) {
  if (role === 'PLATFORM_ADMIN') return '/admin';
  if (role === 'BUSINESS_ADMIN') return '/business/dashboard';
  if (role === 'PARTNER_ADMIN' || role === 'PARTNER_OPERATOR') return '/partner';
  return '/account';
}

// A signed-in user denied an admin page must not bounce between it and /login.
// Destination guards still enforce authorization; this only chooses a safe landing page.
export function getSignedInReturnTo(value: unknown, role: string) {
  const returnTo = getSafeReturnTo(value);
  const fallback = getAccountHomePath(role);
  if (!returnTo) return fallback;
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(returnTo, 'https://return.invalid').pathname);
  } catch {
    return fallback;
  }
  if (pathname === '/login' || pathname.startsWith('/login/')) return fallback;
  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && role !== 'PLATFORM_ADMIN') {
    return fallback;
  }
  return returnTo;
}
