'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('Portal application rendering failed.', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: '#f6f9fc',
          color: '#08284c',
          fontFamily: 'Arial, sans-serif',
          margin: 0,
        }}
      >
        <title>Temporary problem | Mandyal Travels</title>
        <main
          style={{
            margin: '0 auto',
            maxWidth: 720,
            padding: '96px 24px',
          }}
        >
          <p style={{ color: '#1769aa', fontWeight: 700, textTransform: 'uppercase' }}>
            Temporary problem
          </p>
          <h1 style={{ fontSize: 42, fontWeight: 500 }}>Mandyal Travels needs a moment.</h1>
          <p style={{ fontSize: 18, lineHeight: 1.6 }}>
            Your booking and account information have not been changed. Try loading the portal
            again.
          </p>
          {error.digest ? <p>Support reference: {error.digest}</p> : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
            <button
              onClick={() => retry()}
              style={{
                background: '#1769aa',
                border: 0,
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
                padding: '12px 20px',
              }}
              type="button"
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                border: '1px solid #1769aa',
                borderRadius: 8,
                color: '#1769aa',
                fontSize: 16,
                fontWeight: 700,
                padding: '11px 20px',
                textDecoration: 'none',
              }}
            >
              Return home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
