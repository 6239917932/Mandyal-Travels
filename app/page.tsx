import { Card } from '@/components/ui/Card';

const travelOptions = [
  {
    description: 'Find verified stays with transparent pricing, room choices, and flexible policies.',
    name: 'Hotels',
  },
  {
    description: 'Compare flight options, fares, travel times, and booking details in one place.',
    name: 'Flights',
  },
  {
    description: 'Plan comfortable bus journeys with routes, schedules, and seat choices.',
    name: 'Buses',
  },
  {
    description: 'Choose self-drive or chauffeur-ready car rentals for every part of your trip.',
    name: 'Cars',
  },
] as const;

const benefits = [
  {
    description: 'Clear pricing, secure payments, and complete booking documents from confirmation to invoice.',
    title: 'Travel with clarity',
  },
  {
    description: 'One platform for stays, transport, partner services, and future travel experiences.',
    title: 'Everything connected',
  },
  {
    description: 'Built to combine trusted service with intelligent recommendations and support.',
    title: 'Designed around you',
  },
] as const;

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-container home-hero__grid">
          <div>
            <p className="home-hero__eyebrow">One platform. Every journey.</p>

            <h1 className="home-hero__title">
              Travel farther.
              <br />
              <span>Plan smarter.</span>
            </h1>

            <p className="home-hero__description">
              Mandyal Travels brings hotels, flights, buses, and cars together in one trusted travel
              experience.
            </p>

            <div className="home-hero__actions">
              <a className="home-link-button home-link-button--primary" href="#travel-options">
                Explore travel options
              </a>

              <a className="home-link-button home-link-button--secondary" href="#why-mandyal">
                Why Mandyal Travels
              </a>
            </div>

            <div className="home-hero__stats">
              <div className="home-stat">
                <strong>4</strong>
                <span>Travel products</span>
              </div>

              <div className="home-stat">
                <strong>1</strong>
                <span>Connected platform</span>
              </div>

              <div className="home-stat">
                <strong>24/7</strong>
                <span>Support-ready journey</span>
              </div>
            </div>
          </div>

          <div className="home-search-preview">
            <Card className="home-search-preview__card" elevated>
              <p className="home-search-preview__label">Coming in the Hotel Module</p>
              <h2 className="home-search-preview__title">Find your perfect stay</h2>

              <div className="home-search-preview__fields">
                <div className="home-preview-field">
                  <span>Destination</span>
                  <strong>Where do you want to go?</strong>
                </div>

                <div className="home-preview-field">
                  <span>Dates</span>
                  <strong>Select your stay dates</strong>
                </div>

                <div className="home-preview-field">
                  <span>Guests</span>
                  <strong>Rooms and travellers</strong>
                </div>

                <div className="home-preview-field">
                  <span>Experience</span>
                  <strong>Personalized recommendations</strong>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="home-section" id="travel-options">
        <div className="home-container">
          <div className="home-section__heading">
            <p className="home-section__eyebrow">Travel, simplified</p>
            <h2 className="home-section__title">Everything you need to move with confidence.</h2>
            <p className="home-section__description">
              Each product will use the same dependable booking, payment, notification, and support
              foundation.
            </p>
          </div>

          <div className="travel-options-grid">
            {travelOptions.map((option, index) => (
              <Card className="travel-option" key={option.name}>
                <span className="travel-option__number">0{index + 1}</span>
                <h3>{option.name}</h3>
                <p>{option.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section" id="why-mandyal">
        <div className="home-container">
          <div className="home-section__heading">
            <p className="home-section__eyebrow">Built for better journeys</p>
            <h2 className="home-section__title">A travel platform that grows with you.</h2>
          </div>

          <div className="home-benefits-grid">
            {benefits.map((benefit) => (
              <Card className="home-benefit" key={benefit.title}>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}