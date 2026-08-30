import Image from 'next/image';
import type { ReactNode } from 'react';

interface PublicPageHeroProps {
  actions?: ReactNode;
  description: ReactNode;
  eyebrow: string;
  size?: 'default' | 'large';
  title: ReactNode;
}

export function PublicPageHero({
  actions,
  description,
  eyebrow,
  size = 'default',
  title,
}: PublicPageHeroProps) {
  return (
    <section className={`public-page-hero${size === 'large' ? 'public-page-hero--large' : ''}`}>
      <Image
        alt="Himalayan mountain ridges, a winding road, and a hillside lodge at sunrise"
        className="public-page-hero__image"
        fill
        priority
        sizes="100vw"
        src="/home/mandyal-travel-hero-v2.png"
      />
      <div aria-hidden="true" className="public-page-hero__shade" />
      <div className="public-page-hero__content">
        <p className="public-page-hero__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <div className="public-page-hero__description">{description}</div>
        {actions ? <div className="public-page-hero__actions">{actions}</div> : null}
      </div>
    </section>
  );
}
