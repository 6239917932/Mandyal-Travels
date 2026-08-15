import type { Metadata } from 'next';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BackNavigation } from '@/components/layout/BackNavigation';
import { BookingProvider } from '@/context/BookingContext';
import { getCurrentUser } from '@/lib/auth/session';

import './globals.css';

export const metadata: Metadata = {
  description: 'Your trusted partner for hotels, flights, buses, and car rentals.',
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
