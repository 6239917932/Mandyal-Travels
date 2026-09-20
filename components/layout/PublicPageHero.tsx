import Image from 'next/image';
import type { ReactNode } from 'react';

interface PublicPageHeroProps {
  actions?: ReactNode;
  description: ReactNode;
  eyebrow: string;
  imageAlt?: string;
  imagePosition?: string;
  imageSrc?: string;
  size?: 'default' | 'large';
  title: ReactNode;
}

export function PublicPageHero({
  actions,
  description,
  eyebrow,
  imageAlt = 'A welcoming Himalayan hotel setting',
  imagePosition,
  imageSrc = '/home/mandyal-travel-hero-v2.png',
  size = 'default',
  title,
}: PublicPageHeroProps) {
  return (
    <section
      className={['public-page-hero', size === 'large' ? 'public-page-hero--large' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <Image
        alt={imageAlt}
        className="public-page-hero__image"
        fill
        priority
        sizes="100vw"
        src={imageSrc}
        style={imagePosition ? { objectPosition: imagePosition } : undefined}
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
