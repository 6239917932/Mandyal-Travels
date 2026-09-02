'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const railRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  const moveTo = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const rail = railRef.current;
    const items = rail?.querySelectorAll<HTMLElement>('[data-gallery-item]');
    const item = items?.item(index);
    if (!rail || !item || !items) return;

    rail.scrollTo({
      behavior,
      left: item.offsetLeft - rail.offsetLeft,
    });
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    if (
      userPaused ||
      interactionPaused ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % GALLERY.length;
        const rail = railRef.current;
        const item = rail?.querySelectorAll<HTMLElement>('[data-gallery-item]').item(next);
        if (rail && item)
          rail.scrollTo({ behavior: 'smooth', left: item.offsetLeft - rail.offsetLeft });
        return next;
      });
    }, 4_500);

    return () => window.clearInterval(interval);
  }, [interactionPaused, userPaused]);

  return (
    <section
      aria-labelledby="home-gallery-title"
      aria-roledescription="carousel"
      className="home-gallery"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false);
      }}
      onFocusCapture={() => setInteractionPaused(true)}
      onPointerEnter={() => setInteractionPaused(true)}
      onPointerLeave={() => setInteractionPaused(false)}
    >
      <div className="home-gallery__heading">
        <div>
          <p className="home-section__eyebrow">Bir Billing paragliding</p>
          <h2 id="home-gallery-title">
            From Billing&apos;s mountain launch site to Bir&apos;s landing fields.
          </h2>
        </div>
        <p>
          Explore the ridges, open skies, tandem flights, and paragliding landscapes that make Bir
          Billing one of Himachal Pradesh&apos;s signature adventure destinations.
        </p>
        <div aria-label="Gallery controls" className="home-gallery__controls">
          <button
            aria-label="Show previous Bir Billing photograph"
            onClick={() => moveTo((activeIndex - 1 + GALLERY.length) % GALLERY.length)}
            type="button"
          >
            ←
          </button>
          <span aria-live="polite">
            {String(activeIndex + 1).padStart(2, '0')} / {String(GALLERY.length).padStart(2, '0')}
          </span>
          <button
            aria-label={userPaused ? 'Start automatic gallery' : 'Pause automatic gallery'}
            onClick={() => setUserPaused((paused) => !paused)}
            type="button"
          >
            {userPaused ? 'Play' : 'Pause'}
          </button>
          <button
            aria-label="Show next Bir Billing photograph"
            onClick={() => moveTo((activeIndex + 1) % GALLERY.length)}
            type="button"
          >
            →
          </button>
        </div>
      </div>

      <div aria-live="off" className="home-gallery__rail" ref={railRef}>
        {GALLERY.map(([src, label], index) => (
          <figure
            aria-label={`${index + 1} of ${GALLERY.length}: ${label}`}
            className={
              index % 5 === 0 ? 'home-gallery__item home-gallery__item--wide' : 'home-gallery__item'
            }
            data-gallery-item
            key={src}
            role="group"
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
