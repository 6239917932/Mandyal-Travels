export interface NavigationItem {
  href: string;
  label: string;
}

export interface OfficeLocation {
  locality: string;
  region: string;
  type: 'Corporate office' | 'Registered office';
}

export const siteConfig = {
  description:
    'Thoughtful travel planning, trusted bookings, and connected journeys from the Himalayas to everywhere.',
  name: 'Mandyal Travels',
  navigation: [
    { href: '/', label: 'Home' },
    { href: '/trip-planner', label: 'Trip planner' },
    { href: '/destinations', label: 'Destinations' },
    { href: '/offers', label: 'Offers' },
    { href: '/business', label: 'Business' },
    { href: '/partners', label: 'Partners' },
    { href: '/manage-booking', label: 'Manage booking' },
    { href: '/contact', label: 'Contact us' },
  ] satisfies NavigationItem[],
  footerNavigation: [
    { href: '/hotels', label: 'Hotels' },
    { href: '/cars', label: 'Cars' },
    { href: '/flights', label: 'Flights — coming soon' },
    { href: '/buses', label: 'Buses — coming soon' },
    { href: '/partners', label: 'List your hotel or car' },
    { href: '/manage-booking', label: 'Manage booking' },
  ] satisfies NavigationItem[],
  officeLocations: [
    {
      locality: 'Bir, District Kangra',
      region: 'Himachal Pradesh, India',
      type: 'Corporate office',
    },
    {
      locality: 'Joginder Nagar, District Mandi',
      region: 'Himachal Pradesh, India',
      type: 'Registered office',
    },
  ] satisfies OfficeLocation[],
  supportPhone: {
    display: '+91 80693 77940',
    href: '+918069377940',
  },
  supportEmail: 'contact@mandyaltravels.com',
  tagline: 'From the heart of the Himalayas to everywhere.',
} as const;
