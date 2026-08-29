'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

type HeroSlide = {
  label: string;
  position: string;
  src: string;
};

const HERO_SLIDES: readonly HeroSlide[] = [
  {
    label: 'Terraced fields around Bir',
    position: 'center 54%',
    src: '/home/hero/bir-billing-01.jpg',
  },
  {
    label: 'Paragliders above the Dhauladhar foothills',
    position: 'center 48%',
    src: '/home/hero/bir-billing-02.jpg',
  },
  {
    label: 'Paragliders launching from Billing',
    position: 'center 48%',
    src: '/home/hero/bir-billing-03.jpg',
  },
  {
    label: 'Paragliders moving through mountain clouds',
    position: 'center 44%',
    src: '/home/hero/bir-billing-04.jpg',
  },
  {
    label: 'A paraglider above the Kangra valley',
    position: 'center 44%',
    src: '/home/hero/bir-billing-05.jpg',
  },
  {
    label: 'A sky filled with paragliders',
    position: 'center 42%',
    src: '/home/hero/bir-billing-06.jpg',
  },
  {
    label: 'A paraglider crossing the Bir valley',
    position: 'center 45%',
    src: '/home/hero/bir-billing-07.jpg',
  },
  {
    label: 'Paragliding above green Himalayan ridges',
    position: 'center 48%',
    src: '/home/hero/bir-billing-08.jpg',
  },
  {
    label: 'Tandem paragliding above Bir',
    position: 'center 48%',
    src: '/home/hero/bir-billing-09.jpg',
  },
  {
    label: 'Paragliders with the Dhauladhar range behind them',
    position: 'center 52%',
    src: '/home/hero/bir-billing-10.jpg',
  },
  {
    label: 'A sunset flight above Bir',
    position: 'center 48%',
    src: '/home/hero/bir-billing-11.jpg',
  },
  {
    label: 'A paraglider crossing a Himalayan sunset',
    position: 'center 48%',
    src: '/home/hero/bir-billing-12.jpg',
  },
  {
    label: 'Paragliders preparing on a green launch ridge',
    position: 'center 48%',
    src: '/home/hero/bir-billing-13.jpg',
  },
  {
    label: 'A paraglider above the Kangra landscape',
    position: 'center 45%',
    src: '/home/hero/bir-billing-14.jpg',
  },
  {
    label: 'A tandem paragliding flight over terraced fields',
    position: 'center 44%',
    src: '/home/hero/bir-billing-15.jpg',
  },
  {
    label: 'The Billing launch site from above',
    position: 'center 50%',
    src: '/home/hero/bir-billing-16.jpg',
  },
] as const;

const ROTATION_INTERVAL_MS = 7000;

export function HomeHeroSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const showPrevious = useCallback(() => {
    setCurrentIndex((index) => (index === 0 ? HERO_SLIDES.length - 1 : index - 1));
  }, []);

  const showNext = useCallback(() => {
    setCurrentIndex((index) => (index + 1) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (isPaused || motionPreference.matches) {
      return undefined;
    }

    const rotation = window.setInterval(() => {
      if (!document.hidden) {
        showNext();
      }
    }, ROTATION_INTERVAL_MS);

    return () => window.clearInterval(rotation);
  }, [isPaused, showNext]);

  const currentSlide = HERO_SLIDES[currentIndex];

  return (
    <>
      <div aria-hidden="true" className="home-hero-slider__media">
        <Image
          key={currentSlide.src}
          alt=""
          className="home-hero-slider__image"
          fill
          preload={currentIndex === 0}
          sizes="100vw"
          src={currentSlide.src}
          style={{ objectPosition: currentSlide.position }}
        />
      </div>

      <div
        aria-label="Bir Billing hero photographs"
        className="home-hero-slider__controls"
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsPaused(false);
          }
        }}
        onFocusCapture={() => setIsPaused(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            showPrevious();
          }

          if (event.key === 'ArrowRight') {
            event.preventDefault();
            showNext();
          }
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        role="group"
      >
        <div className="home-hero-slider__caption">
          <span>Explore Bir Billing</span>
          <strong>{currentSlide.label}</strong>
        </div>

        <div className="home-hero-slider__navigation">
          <button aria-label="Show previous hero photograph" onClick={showPrevious} type="button">
            <span aria-hidden="true">&#8592;</span>
          </button>

          <span className="home-hero-slider__count">
            {String(currentIndex + 1).padStart(2, '0')} /{' '}
            {String(HERO_SLIDES.length).padStart(2, '0')}
          </span>

          <button aria-label="Show next hero photograph" onClick={showNext} type="button">
            <span aria-hidden="true">&#8594;</span>
          </button>
        </div>

        <div aria-label="Choose a hero photograph" className="home-hero-slider__dots" role="group">
          {HERO_SLIDES.map((slide, index) => (
            <button
              aria-label={`Show photograph ${index + 1}: ${slide.label}`}
              aria-pressed={index === currentIndex}
              className={index === currentIndex ? 'is-active' : undefined}
              key={slide.src}
              onClick={() => setCurrentIndex(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </>
  );
}
