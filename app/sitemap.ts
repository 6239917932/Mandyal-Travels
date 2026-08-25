import type { MetadataRoute } from 'next';

import { POLICY_KINDS } from '@/lib/legal/policies';
import { absolutePublicUrl, buildPublicSitemapRecords } from '@/lib/seo/publicIndexing';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import { prisma } from '@/lib/prisma';
import { hotelService } from '@/services/hotelService';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = resolvePublicPortalOrigin();
  const [hotels, destinations] = await Promise.all([
    hotelService.getHotels(),
    prisma.destinationContent.findMany({
      orderBy: { slug: 'asc' },
      select: { slug: true, updatedAt: true },
      where: { status: 'PUBLISHED' },
    }),
  ]);
  const records = buildPublicSitemapRecords({
    destinations,
    hotelSlugs: hotels.map((hotel) => hotel.slug),
    legalPolicySlugs: POLICY_KINDS,
  });

  return records.map((record) => ({
    changeFrequency: record.changeFrequency,
    ...(record.lastModified ? { lastModified: record.lastModified } : {}),
    priority: record.priority,
    url: absolutePublicUrl(origin, record.path),
  }));
}
