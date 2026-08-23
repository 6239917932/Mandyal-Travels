export interface NavigationItem {
  href: string;
  label: string;
}

export const siteConfig = {
  description:
    'Thoughtful travel planning, trusted bookings, and connected journeys from the Himalayas to everywhere.',
  name: 'Mandyal Travels',
  navigation: [
    { href: '/', label: 'Home' },
    { href: '/flights', label: 'Flights' },
    { href: '/hotels', label: 'Hotels' },
    { href: '/buses', label: 'Buses' },
    { href: '/cars', label: 'Cars' },
    { href: '/trip-planner', label: 'Trip planner' },
    { href: '/destinations', label: 'Destinations' },
    { href: '/offers', label: 'Offers' },
    { href: '/business', label: 'Business' },
    { href: '/partners', label: 'Partners' },
    { href: '/manage-booking', label: 'Manage booking' },
  ] satisfies NavigationItem[],
  supportEmail: 'support@mandyaltravels.com',
  tagline: 'From the heart of the Himalayas to everywhere.',
} as const;
