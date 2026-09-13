import { siteConfig } from '@/config/site';
import { PUBLIC_SITE_ORIGIN } from '@/lib/seo/siteMetadata';

const organizationId = `${PUBLIC_SITE_ORIGIN}/#organization`;
const websiteId = `${PUBLIC_SITE_ORIGIN}/#website`;
const webpageId = `${PUBLIC_SITE_ORIGIN}/#webpage`;
const primaryImageId = `${PUBLIC_SITE_ORIGIN}/#primaryimage`;

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
      identifier: {
        '@type': 'PropertyValue',
        name: 'Corporate Identity Number',
        propertyID: 'CIN',
        value: 'U49221HP2026PTC012778',
      },
      legalName: siteConfig.legalName,
      logo: {
        '@type': 'ImageObject',
        contentUrl: `${PUBLIC_SITE_ORIGIN}/brand/mandyal-travels-signature.png`,
        url: `${PUBLIC_SITE_ORIGIN}/brand/mandyal-travels-signature.png`,
      },
      mainEntityOfPage: { '@id': webpageId },
      name: siteConfig.name,
      alternateName: siteConfig.legalName,
      slogan: siteConfig.tagline,
      telephone: siteConfig.supportPhone.href,
      url: PUBLIC_SITE_ORIGIN,
    },
    {
      '@id': websiteId,
      '@type': 'WebSite',
      inLanguage: 'en-IN',
      name: siteConfig.name,
      alternateName: siteConfig.legalName,
      publisher: { '@id': organizationId },
      url: PUBLIC_SITE_ORIGIN,
    },
    {
      '@id': primaryImageId,
      '@type': 'ImageObject',
      contentUrl: `${PUBLIC_SITE_ORIGIN}/home/mandyal-travel-hero-v2.png`,
      url: `${PUBLIC_SITE_ORIGIN}/home/mandyal-travel-hero-v2.png`,
    },
    {
      '@id': webpageId,
      '@type': 'WebPage',
      about: { '@id': organizationId },
      description:
        'Official website of Mandyal Travels, operated by Mandyal Travels Services Private Limited, for hotel discovery, car rentals, trip planning and partner management in Himachal Pradesh, India.',
      inLanguage: 'en-IN',
      isPartOf: { '@id': websiteId },
      mainEntity: { '@id': organizationId },
      name: 'Mandyal Travels | Himachal Hotels, Cars and Trip Planning',
      primaryImageOfPage: { '@id': primaryImageId },
      url: `${PUBLIC_SITE_ORIGIN}/`,
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
