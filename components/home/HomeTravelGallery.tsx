import Image from 'next/image';

const GALLERY = [
  ['bir-billing-01.jpg', 'Terraced fields around Bir'],
  ['bir-billing-02.jpg', 'Paragliders above the Dhauladhar foothills'],
  ['bir-billing-03.jpg', 'Paragliders launching from Billing'],
  ['bir-billing-04.jpg', 'Paragliders moving through mountain clouds'],
  ['bir-billing-05.jpg', 'A paraglider above the Kangra valley'],
  ['bir-billing-06.jpg', 'A sky filled with paragliders'],
  ['bir-billing-07.jpg', 'A paraglider crossing the Bir valley'],
  ['bir-billing-08.jpg', 'Paragliding above green Himalayan ridges'],
  ['bir-billing-09.jpg', 'Tandem paragliding above Bir'],
  ['bir-billing-10.jpg', 'The Dhauladhar range behind colourful paragliders'],
  ['bir-billing-11.jpg', 'A sunset flight above Bir'],
  ['bir-billing-12.jpg', 'A paraglider crossing a Himalayan sunset'],
  ['bir-billing-13.jpg', 'Paragliders preparing on a green launch ridge'],
  ['bir-billing-14.jpg', 'A paraglider above the Kangra landscape'],
  ['bir-billing-15.jpg', 'A tandem flight over terraced fields'],
  ['bir-billing-16.jpg', 'The Billing launch site from above'],
] as const;

export function HomeTravelGallery() {
  return (
    <section aria-labelledby="home-gallery-title" className="home-gallery">
      <div className="home-gallery__heading">
        <div>
          <p className="home-section__eyebrow">Himachal through our lens</p>
          <h2 id="home-gallery-title">
            From Mandi&apos;s valleys to Bir Billing&apos;s open skies.
          </h2>
        </div>
        <p>Browse the places and experiences that inspire the journeys we help travellers build.</p>
      </div>

      <div className="home-gallery__rail">
        {GALLERY.map(([src, label], index) => (
          <figure
            className={
              index % 5 === 0 ? 'home-gallery__item home-gallery__item--wide' : 'home-gallery__item'
            }
            key={src}
          >
            <Image
              alt={label}
              fill
              sizes="(max-width: 700px) 78vw, (max-width: 1100px) 42vw, 30vw"
              src={`/home/hero/${src}`}
            />
            <figcaption>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {label}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
