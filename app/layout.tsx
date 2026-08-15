import type { Metadata } from 'next';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BackNavigation } from '@/components/layout/BackNavigation';
import { BookingProvider } from '@/context/BookingContext';
import { getCurrentUser } from '@/lib/auth/session';

import './globals.css';

export const metadata: Metadata = {
  applicationName: 'Mandyal Travels',
  creator: 'Mandyal Travels',
  description:
    'Thoughtful travel planning, trusted bookings, and connected journeys from the Himalayas to everywhere.',
  icons: {
    icon: '/brand/mandyal-symbol.svg',
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <BookingProvider>
          <SiteHeader user={user ? { firstName: user.firstName, role: user.role } : null} />
          <BackNavigation />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </BookingProvider>
      </body>
    </html>
  );
}
