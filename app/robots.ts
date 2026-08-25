import type { MetadataRoute } from 'next';

import { ROBOTS_DISALLOWED_PATHS } from '@/lib/seo/publicIndexing';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const origin = resolvePublicPortalOrigin();

  return {
    host: origin,
    rules: {
      allow: '/',
      disallow: [...ROBOTS_DISALLOWED_PATHS],
      userAgent: '*',
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
