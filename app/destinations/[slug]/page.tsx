import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { parseDestinationContentList } from '@/services/destinationContentService';

type Props = { params: Promise<{ slug: string }> };

async function publishedDestination(slug: string) {
  return prisma.destinationContent.findFirst({ where: { slug, status: 'PUBLISHED' } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const destination = await publishedDestination((await params).slug);
  if (!destination) return { title: 'Destination not found' };
  return {
    description: destination.summary,
    title: `${destination.name} travel guide`,
  };
}

export default async function DestinationGuidePage({ params }: Props) {
  const destination = await publishedDestination((await params).slug);
  if (!destination) notFound();
  const highlights = parseDestinationContentList(destination.highlightsJson);
  const travelTips = parseDestinationContentList(destination.travelTipsJson);
  return (
    <main className="destination-guide">
      <header
        className="destination-guide__hero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgb(3 19 35 / 92%), rgb(3 19 35 / 35%)), url(${JSON.stringify(destination.heroImageUrl)})`,
        }}
      >
        <div>
          <p>
            {destination.state}, {destination.country}
          </p>
          <h1>{destination.name}</h1>
          <span>{destination.summary}</span>
        </div>
      </header>
      <div className="destination-guide__body">
        <section>
          <p className="home-section__eyebrow">Know before you go</p>
          <h2>About {destination.name}</h2>
          <p>{destination.introduction}</p>
        </section>
        <aside>
          <h2>Best time to visit</h2>
          <p>{destination.bestTimeToVisit}</p>
        </aside>
        <section>
          <h2>Highlights</h2>
          <ul>
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Practical travel tips</h2>
          <ul>
            {travelTips.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="destination-guide__notice">
          <h2>Plan with current information</h2>
          <p>
            This guide provides reviewed travel context, not an availability, weather, transport,
            safety, visa, price, or booking guarantee. Recheck current conditions before travel.
          </p>
          <div>
            <Link
              className="ui-button ui-button--primary"
              href={`/hotels?destination=${encodeURIComponent(destination.name)}`}
            >
              Search stays
            </Link>
            <Link className="ui-button ui-button--secondary" href="/trip-planner">
              Build a trip plan
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
