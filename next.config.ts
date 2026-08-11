import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV !== 'production';
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'" + (isDevelopment ? ' ws: wss:' : ''),
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https://images.unsplash.com",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'" + (isDevelopment ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline'",
  ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          ...(isDevelopment
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
        source: '/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        hostname: 'images.unsplash.com',
        protocol: 'https',
      },
    ],
  },
};

export default nextConfig;
