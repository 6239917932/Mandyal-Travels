import type { Metadata, Viewport } from 'next';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BackNavigation } from '@/components/layout/BackNavigation';
import { ServiceAdvisoryBanner } from '@/components/layout/ServiceAdvisoryBanner';
import { BookingProvider } from '@/context/BookingContext';
import { getCurrentUser } from '@/lib/auth/session';
import { getVisibleServiceAdvisories } from '@/services/serviceAdvisoryService';

import './globals.css';

export const metadata: Metadata = {
  applicationName: 'Mandyal Travels',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mandyal Travels',
  },
  creator: 'Mandyal Travels',
  description:
    'Thoughtful travel planning, trusted bookings, and connected journeys from the Himalayas to everywhere.',
  icons: {
    apple: [
      {
        sizes: '180x180',
        type: 'image/png',
        url: '/brand/mandyal-apple-touch-icon.png',
      },
    ],
    icon: [
      { type: 'image/svg+xml', url: '/brand/mandyal-symbol.svg' },
      {
        sizes: '192x192',
        type: 'image/png',
        url: '/brand/mandyal-app-icon-192.png',
      },
      {
        sizes: '512x512',
        type: 'image/png',
        url: '/brand/mandyal-app-icon-512.png',
      },
    ],
    shortcut: '/brand/mandyal-symbol.svg',
  },
  openGraph: {
    description:
      'Thoughtful travel planning, trusted bookings, and connected journeys from the Himalayas to everywhere.',
    title: 'Mandyal Travels',
    type: 'website',
  },
  keywords: [
    'Mandyal Travels',
    'Mandi Himachal Pradesh travel',
    'Himachal hotels',
    'Bir Billing stays',
    'India travel booking',
  ],
  title: {
    default: 'Mandyal Travels',
    template: '%s | Mandyal Travels',
  },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#0c3157',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, advisories] = await Promise.all([
    getCurrentUser(),
    getVisibleServiceAdvisories(new Date()),
  ]);

  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <BookingProvider>
          <SiteHeader user={user ? { firstName: user.firstName, role: user.role } : null} />
          <BackNavigation />
          <ServiceAdvisoryBanner advisories={advisories} />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </BookingProvider>
      </body>
    </html>
  );
}
