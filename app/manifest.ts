import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#f7f9fc',
    categories: ['travel', 'business'],
    description:
      'Thoughtful travel planning, trusted bookings, and connected journeys from the Himalayas to everywhere.',
    display: 'standalone',
    icons: [
      {
        src: '/brand/mandyal-signature-app-icon-v2-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/brand/mandyal-signature-app-icon-v2-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        purpose: 'maskable',
        src: '/brand/mandyal-signature-maskable-v2-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    id: '/',
    lang: 'en-IN',
    name: 'Mandyal Travels',
    orientation: 'any',
    scope: '/',
    short_name: 'Mandyal',
    shortcuts: [
      {
        description: 'Search available stays by destination and date.',
        name: 'Find a hotel',
        short_name: 'Hotels',
        url: '/hotels',
      },
      {
        description: 'Search self-drive and chauffeur car options.',
        name: 'Find a car',
        short_name: 'Cars',
        url: '/cars',
      },
      {
        description: 'Create an editable, explainable journey plan.',
        name: 'Plan a trip',
        short_name: 'Trip planner',
        url: '/trip-planner',
      },
      {
        description: 'Open an existing booking with its reference.',
        name: 'Manage a booking',
        short_name: 'Manage booking',
        url: '/manage-booking',
      },
    ],
    start_url: '/',
    theme_color: '#0c3157',
  };
}
