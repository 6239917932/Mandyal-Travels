import Image from 'next/image';
import Link from 'next/link';

import { HomeBookingWidget } from '@/components/home/HomeBookingWidget';
import { HomeTravelGallery } from '@/components/home/HomeTravelGallery';
import { OrganizationStructuredData } from '@/components/seo/OrganizationStructuredData';
import { siteConfig } from '@/config/site';
import { createPublicMetadata } from '@/lib/seo/siteMetadata';

const description =
  'Mandyal Travels Services Private Limited offers hotel discovery, car rentals and trip planning from Mandi and Kangra, Himachal Pradesh.';

export const metadata = createPublicMetadata({
  absoluteTitle: true,
  description,
  path: '/',
  title: 'Mandyal Travels | Himachal Hotels, Cars and Trip Planning',
});

const trustPoints = [
  {
    description: 'Understand the fare, inclusions, policies, and next step before you confirm.',
    number: '01',
    title: 'Clarity before checkout',
  },
  {
    description: 'Keep stays and transport together through one connected travel account.',
    number: '02',
    title: 'A joined-up journey',
  },
  {
    description: 'Search by the place travellers actually know—from a city to a local area.',
    number: '03',
    title: 'Locality-aware discovery',
  },
] as const;

function ArrowIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path
        d="M4 10h11M11 6l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MountainLine() {
  return (
    <svg
      aria-hidden="true"
      className="home-origin__mountains"
      focusable="false"
      viewBox="0 0 560 92"
    >
      <path d="M0 78 77 30l47 31 53-48 58 57 53-41 42 31 73-54 54 42 49-22 54 52" fill="none" />
      <path d="m153 34 24-21 22 22M377 25l26-19 25 20" fill="none" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="home-page">
      <OrganizationStructuredData />
      <section aria-labelledby="home-search-title" className="home-search-hero">
        <Image
          alt="Himalayan mountain ridges, a winding road, and a hillside lodge at sunrise"
          className="home-search-hero__image"
          fill
          priority
          sizes="100vw"
          src="/home/mandyal-travel-hero-v2.png"
        />
        <div className="home-search-hero__shade" />
        <div className="home-container home-search-hero__content">
          <div className="home-search-hero__copy">
            <p>Hotels and cars, thoughtfully connected</p>
            <h1 id="home-search-title">Stay, drive, and grow with us.</h1>
            <span>
              Rooted in Himachal, we promise clear choices, dependable service, and human support—
              so every journey feels cared for from the first search to your safe return home.
            </span>
          </div>
          <HomeBookingWidget />
        </div>
      </section>

      <section aria-labelledby="home-intro-title" className="home-intro">
        <div className="home-container home-intro__grid">
          <div className="home-intro__heading">
            <p className="home-section__eyebrow">Rooted in Mandi, Himachal Pradesh</p>
            <h2 className="home-intro__title" id="home-intro-title">
              Journeys shaped by the mountains.
              <span> Built for everywhere.</span>
            </h2>
          </div>

          <div className="home-intro__details">
            <p>
              Mandyal Travels brings the grounded hospitality of our Himalayan home to a modern,
              connected platform for booking stays and cars—and for local owners to manage their
              inventory and reach more customers.
            </p>

            <div className="home-intro__actions">
              <Link className="home-link-button home-link-button--primary" href="/hotels">
                Find a stay <ArrowIcon />
              </Link>
              <Link className="home-link-button home-link-button--outline" href="/trip-planner">
                Plan my whole trip
              </Link>
            </div>

            <ul className="home-intro__assurances" aria-label="Mandyal Travels platform benefits">
              <li>Transparent choices</li>
              <li>Secure booking journey</li>
              <li>Local understanding</li>
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="supplier-launch-title" className="home-travel" id="supplier-launch">
        <div className="home-container">
          <div className="home-section__heading home-section__heading--row">
            <div>
              <p className="home-section__eyebrow">Now onboarding in Himachal Pradesh</p>
              <h2 className="home-section__title" id="supplier-launch-title">
                Put your hotel or car business online.
              </h2>
            </div>
            <p className="home-section__description">
              Start with property and fleet management today. Customer discovery and bookings can
              grow as verified local inventory joins the platform.
            </p>
          </div>

          <div className="travel-options-grid travel-options-grid--launch">
            <Link className="travel-option" href="/partners">
              <span className="travel-option__number">01</span>
              <span className="travel-option__status">Hotel PMS</span>
              <h3>List and manage your hotel</h3>
              <p>
                Control properties, rooms, rates, availability, reservations, and stay operations.
              </p>
              <span className="travel-option__arrow" aria-hidden="true">
                <ArrowIcon />
              </span>
            </Link>
            <Link className="travel-option" href="/partners">
              <span className="travel-option__number">02</span>
              <span className="travel-option__status">Car fleet</span>
              <h3>List and manage your cars</h3>
              <p>
                Control vehicles, rates, availability, maintenance, compliance, and reservations.
              </p>
              <span className="travel-option__arrow" aria-hidden="true">
                <ArrowIcon />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="origin-title" className="home-origin" id="why-mandyal">
        <div className="home-container home-origin__grid">
          <div className="home-origin__story">
            <p className="home-section__eyebrow">The meaning behind our name</p>
            <h2 className="home-section__title" id="origin-title">
              Mandyal is our identity.
            </h2>
            <p>
              We come from Mandi—the meeting place of mountain roads, rivers, communities, and
              journeys across Himachal Pradesh. “Mandyal” is the identity we carry from home and the
              spirit we bring to every traveller we serve.
            </p>
            <blockquote>“Go far, but carry the warmth of home with you.”</blockquote>
            <p className="home-origin__signature">— The Mandyal way to travel</p>
            <MountainLine />
          </div>

          <HomeTravelGallery />
        </div>
      </section>

      <section aria-labelledby="trust-title" className="home-trust">
        <div className="home-container">
          <div className="home-section__heading">
            <p className="home-section__eyebrow">Thoughtful by design</p>
            <h2 className="home-section__title" id="trust-title">
              Modern travel, with a more human point of view.
            </h2>
          </div>

          <div className="home-trust__grid">
            {trustPoints.map((point) => (
              <article className="home-trust__item" key={point.number}>
                <span>{point.number}</span>
                <h3>{point.title}</h3>
                <p>{point.description}</p>
              </article>
            ))}
          </div>

          <section aria-labelledby="office-presence-title" className="home-presence">
            <div className="home-presence__intro">
              <div>
                <p className="home-section__eyebrow">Here when you need us</p>
                <h2 id="office-presence-title">Himachal roots. A growing regional presence.</h2>
              </div>
              <p>
                Reach our travel support team directly or find the Mandyal Travels office presence
                closest to you. For booking help, include your confirmation reference so we can
                assist faster.
              </p>
            </div>

            <div className="home-presence__grid">
              {siteConfig.officeLocations.map((office) => (
                <article className="home-office-card" key={`${office.type}-${office.locality}`}>
                  <span>{office.type}</span>
                  <address>
                    <strong>{office.locality}</strong>
                    <small>{office.region}</small>
                  </address>
                </article>
              ))}
            </div>

            <div className="home-contact-strip">
              <div>
                <span>Call our team</span>
                <a href={`tel:${siteConfig.supportPhone.href}`}>
                  {siteConfig.supportPhone.display}
                </a>
              </div>
              <div>
                <span>Email support</span>
                <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>
              </div>
              <Link className="home-link-button home-link-button--primary" href="/contact">
                Contact us <ArrowIcon />
              </Link>
            </div>
          </section>

          <div className="home-cta">
            <div>
              <p className="home-section__eyebrow">Ready when you are</p>
              <h2>Where should your next journey begin?</h2>
            </div>
            <div className="home-cta__actions">
              <Link className="home-link-button home-link-button--primary" href="/hotels">
                Search hotels
              </Link>
              <Link className="home-link-button home-link-button--outline" href="/partners">
                List your hotel or car
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
