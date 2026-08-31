export const ROBOTS_DISALLOWED_PATHS = [
  '/account',
  '/admin',
  '/agent',
  '/api',
  '/buses/booking',
  '/business/audit',
  '/business/dashboard',
  '/business/invitations',
  '/business/members',
  '/business/reports',
  '/business/requests',
  '/business/statements',
  '/business/support',
  '/cars/booking',
  '/flights/booking',
  '/forgot-password',
  '/hotels/*/booking',
  '/login',
  '/manage-booking',
  '/partner$',
  '/partner/',
  '/partners/apply',
  '/register',
  '/reset-password',
] as const;

export const PUBLIC_STATIC_SITEMAP_ENTRIES = [
  { changeFrequency: 'daily', path: '/', priority: 1 },
  { changeFrequency: 'monthly', path: '/about', priority: 0.8 },
  { changeFrequency: 'daily', path: '/hotels', priority: 0.9 },
  { changeFrequency: 'daily', path: '/cars', priority: 0.8 },
  { changeFrequency: 'weekly', path: '/trip-planner', priority: 0.8 },
  { changeFrequency: 'weekly', path: '/destinations', priority: 0.8 },
  { changeFrequency: 'daily', path: '/offers', priority: 0.7 },
  { changeFrequency: 'monthly', path: '/business', priority: 0.6 },
  { changeFrequency: 'monthly', path: '/partners', priority: 0.6 },
  { changeFrequency: 'monthly', path: '/legal', priority: 0.4 },
  { changeFrequency: 'monthly', path: '/contact', priority: 0.6 },
  { changeFrequency: 'monthly', path: '/pricing', priority: 0.5 },
] as const;

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface PublicSitemapRecord {
  changeFrequency: 'daily' | 'monthly' | 'weekly';
  lastModified?: Date;
  path: string;
  priority: number;
}

interface DynamicPublicSitemapRecords {
  destinations: ReadonlyArray<{ slug: string; updatedAt: Date }>;
  hotelSlugs: readonly string[];
  legalPolicySlugs: readonly string[];
}

export function absolutePublicUrl(origin: string, path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('PUBLIC_SITEMAP_PATH_INVALID');
  }
  const canonicalOrigin = new URL(origin).origin;
  const url = new URL(path, `${canonicalOrigin}/`);
  if (url.origin !== canonicalOrigin) throw new Error('PUBLIC_SITEMAP_PATH_INVALID');
  return url.toString();
}

export function buildPublicSitemapRecords({
  destinations,
  hotelSlugs,
  legalPolicySlugs,
}: DynamicPublicSitemapRecords): PublicSitemapRecord[] {
  const records: PublicSitemapRecord[] = [...PUBLIC_STATIC_SITEMAP_ENTRIES];
  const seenPaths = new Set(records.map((record) => record.path));

  const append = (record: PublicSitemapRecord) => {
    if (seenPaths.has(record.path)) return;
    seenPaths.add(record.path);
    records.push(record);
  };

  for (const slug of [...new Set(hotelSlugs)].sort()) {
    if (!SAFE_SLUG.test(slug)) continue;
    append({ changeFrequency: 'daily', path: `/hotels/${slug}`, priority: 0.8 });
  }

  for (const destination of [...destinations].sort((first, second) =>
    first.slug.localeCompare(second.slug),
  )) {
    if (!SAFE_SLUG.test(destination.slug)) continue;
    append({
      changeFrequency: 'weekly',
      lastModified: destination.updatedAt,
      path: `/destinations/${destination.slug}`,
      priority: 0.7,
    });
  }

  for (const slug of [...new Set(legalPolicySlugs)].sort()) {
    if (!SAFE_SLUG.test(slug)) continue;
    append({ changeFrequency: 'monthly', path: `/legal/${slug}`, priority: 0.3 });
  }

  return records;
}
