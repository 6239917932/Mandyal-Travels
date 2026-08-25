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
        src: '/brand/mandyal-app-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/brand/mandyal-app-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        purpose: 'maskable',
        src: '/brand/mandyal-maskable-icon-512.png',
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
    start_url: '/',
    theme_color: '#0c3157',
  };
}
