import { siteConfig } from '@/config/site';
import { PUBLIC_SITE_ORIGIN } from '@/lib/seo/siteMetadata';

const organizationId = `${PUBLIC_SITE_ORIGIN}/#organization`;

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@id': organizationId,
      '@type': ['Organization', 'TravelAgency'],
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
        addressLocality: 'Joginder Nagar',
        addressRegion: 'Himachal Pradesh',
        postalCode: '175032',
        streetAddress: 'Village Suja, P.O. Matroo, Tehsil Joginder Nagar, District Mandi',
      },
      areaServed: [
        { '@type': 'AdministrativeArea', name: 'Himachal Pradesh' },
        { '@type': 'Country', name: 'India' },
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: siteConfig.supportEmail,
        telephone: siteConfig.supportPhone.href,
      },
      description: siteConfig.description,
      email: siteConfig.supportEmail,
      foundingDate: '2026-06-17',
      image: `${PUBLIC_SITE_ORIGIN}/home/mandyal-travel-hero-v2.png`,
      legalName: siteConfig.legalName,
      logo: `${PUBLIC_SITE_ORIGIN}/brand/mandyal-app-icon-512.png`,
      name: siteConfig.name,
      alternateName: siteConfig.legalName,
      slogan: siteConfig.tagline,
      telephone: siteConfig.supportPhone.href,
      url: PUBLIC_SITE_ORIGIN,
    },
    {
      '@id': `${PUBLIC_SITE_ORIGIN}/#website`,
      '@type': 'WebSite',
      inLanguage: 'en-IN',
      name: siteConfig.name,
      alternateName: siteConfig.legalName,
      publisher: { '@id': organizationId },
      url: PUBLIC_SITE_ORIGIN,
    },
  ],
};

export function OrganizationStructuredData() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replaceAll('<', '\\u003c'),
      }}
      type="application/ld+json"
    />
  );
}
