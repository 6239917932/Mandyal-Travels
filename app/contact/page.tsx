import Link from 'next/link';

import { ContactInquiryForm } from '@/components/contact/ContactInquiryForm';
import { siteConfig } from '@/config/site';
import { createPublicMetadata } from '@/lib/seo/siteMetadata';

export const metadata = createPublicMetadata({
  description:
    'Contact Mandyal Travels in Himachal Pradesh for travel support, company information and future hotel or car partner onboarding.',
  path: '/contact',
  title: 'Contact Us',
});

function ContactArrow() {
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

export default function ContactPage() {
  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div className="home-container contact-hero__grid">
          <div>
            <p className="home-section__eyebrow">Contact Mandyal Travels</p>
            <h1>Travel questions deserve a human answer.</h1>
            <p>
              Whether you are planning a new journey or need help with an existing booking, our
              support team is ready to guide you from the next clear step.
            </p>
          </div>

          <div className="contact-hero__actions">
            <a className="contact-action" href={`tel:${siteConfig.supportPhone.href}`}>
              <span>Call our team</span>
              <strong>{siteConfig.supportPhone.display}</strong>
              <small>For travel and booking assistance</small>
            </a>
            <a className="contact-action" href={`mailto:${siteConfig.supportEmail}`}>
              <span>Email support</span>
              <strong>{siteConfig.supportEmail}</strong>
              <small>Include your booking reference when available</small>
            </a>
          </div>
        </div>
      </section>

      <section aria-label="Message Mandyal Travels" className="contact-message-section">
        <div className="home-container">
          <ContactInquiryForm />
        </div>
      </section>

      <section aria-labelledby="contact-offices-title" className="contact-offices">
        <div className="home-container">
          <div className="home-section__heading home-section__heading--row">
            <div>
              <p className="home-section__eyebrow">Our office presence</p>
              <h2 className="home-section__title" id="contact-offices-title">
                Rooted in Himachal. Connected beyond it.
              </h2>
            </div>
            <p className="home-section__description">
              Our listed locations show the cities and districts where Mandyal Travels has an office
              presence. Please call before planning an in-person visit.
            </p>
          </div>

          <div className="contact-offices__grid">
            {siteConfig.officeLocations.map((office, index) => (
              <article className="contact-office" key={`${office.type}-${office.locality}`}>
                <span>0{index + 1}</span>
                <p>{office.type}</p>
                <address>
                  <strong>{office.locality}</strong>
                  <small>{office.region}</small>
                </address>
              </article>
            ))}
          </div>

          <div className="contact-guidance">
            <div>
              <p className="home-section__eyebrow">Registered business identity</p>
              <h2>{siteConfig.legalName}</h2>
              <address>
                {siteConfig.registeredOffice.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </address>
            </div>
            <p>
              This is the legal company name and registered-office address used for business and
              payment-provider verification. Mandyal Travels is the customer-facing brand.
            </p>
          </div>

          <div className="contact-guidance">
            <div>
              <p className="home-section__eyebrow">Already booked?</p>
              <h2>Get to the right help faster.</h2>
              <p>
                Open Manage booking for your itinerary and servicing options. If you contact us,
                share only your booking reference—never send card details, passwords, or one-time
                codes by email or phone.
              </p>
            </div>
            <div className="contact-guidance__actions">
              <Link className="home-link-button home-link-button--primary" href="/manage-booking">
                Manage booking <ContactArrow />
              </Link>
              <Link className="home-link-button home-link-button--outline" href="/">
                Return home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
