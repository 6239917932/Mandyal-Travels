export interface NavigationItem {
  href: string;
  label: string;
}

export const siteConfig = {
  description: 'Your trusted partner for hotels, flights, buses, and car rentals.',
  name: 'Mandyal Travels',
  navigation: [
    { href: '/', label: 'Home' },
    { href: '/flights', label: 'Flights' },
    { href: '/hotels', label: 'Hotels' },
    { href: '/buses', label: 'Buses' },
    { href: '/cars', label: 'Cars' },
    { href: '/trip-planner', label: 'Trip planner' },
    { href: '/offers', label: 'Offers' },
    { href: '/business', label: 'Business' },
    { href: '/partners', label: 'Partners' },
    { href: '/manage-booking', label: 'Manage booking' },
  ] satisfies NavigationItem[],
  supportEmail: 'support@mandyaltravels.com',
} as const;
