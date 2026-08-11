import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BackNavigation } from '@/components/layout/BackNavigation';
import { BookingProvider } from '@/context/BookingContext';
import { getCurrentUser } from '@/lib/auth/session';

import './globals.css';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <BookingProvider>
          <SiteHeader user={user ? { firstName: user.firstName, role: user.role } : null} />
          <BackNavigation />
          <main>{children}</main>
          <SiteFooter />
        </BookingProvider>
      </body>
    </html>
  );
}
