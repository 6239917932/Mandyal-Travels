import Link from 'next/link';
import { PublicPageHero } from '@/components/layout/PublicPageHero';

import { prisma } from '@/lib/prisma';
import { createPublicMetadata } from '@/lib/seo/siteMetadata';

export const metadata = createPublicMetadata({
  description:
    'Explore reviewed Himachal Pradesh destination guides and practical travel-planning information from Mandyal Travels.',
  path: '/destinations',
  title: 'Himachal Pradesh Destination Guides',
});

export default async function DestinationsPage() {
  const destinations = await prisma.destinationContent.findMany({
    orderBy: [{ state: 'asc' }, { name: 'asc' }],
    select: { heroImageUrl: true, name: true, slug: true, state: true, summary: true },
    where: { status: 'PUBLISHED' },
  });
  return (
    <main className="destination-index">
      <PublicPageHero
        description="Explore human-reviewed destination context, then confirm current availability, timing, and prices through the live travel search journeys."
        eyebrow="Reviewed travel inspiration"
        title="Destination guides"
      />
      <section aria-label="Published destination guides" className="destination-index__grid">
        {destinations.map((destination) => (
          <article className="destination-card" key={destination.slug}>
            <div
              aria-hidden="true"
              className="destination-card__image"
              style={{ backgroundImage: `url(${JSON.stringify(destination.heroImageUrl)})` }}
            />
            <div className="destination-card__content">
              <span>{destination.state}</span>
              <h2>{destination.name}</h2>
              <p>{destination.summary}</p>
              <Link href={`/destinations/${destination.slug}`}>Read destination guide</Link>
            </div>
          </article>
        ))}
        {destinations.length === 0 ? (
          <div className="destination-index__empty">
            <h2>Guides are being reviewed</h2>
            <p>No destination guide has been published yet. Hotel search remains available.</p>
            <Link className="ui-button ui-button--primary" href="/hotels">
              Search hotels
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
