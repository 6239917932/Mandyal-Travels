export interface NavigationItem {
  href: string;
  label: string;
}

export const siteConfig = {
  description: 'Your trusted partner for hotels, flights, buses, and car rentals.',
  name: 'Mandyal Travels',
  navigation: [
    { href: '/', label: 'Home' },
    { href: '/hotels', label: 'Hotels' },
    { href: '/manage-booking', label: 'Manage booking' },
    { href: '/flights', label: 'Flights' },
    { href: '/buses', label: 'Buses' },
    { href: '/cars', label: 'Cars' },
  ] satisfies NavigationItem[],
  supportEmail: 'support@mandyaltravels.com',
} as const;
