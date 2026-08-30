import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizeNewsletterSubscription } from '../services/publicNewsletterRules.ts';

test('footer presents company, partner, mailing-list, payment, and security information', async () => {
  const [footer, payments, newsletter] = await Promise.all([
    readFile(new URL('../components/layout/SiteFooter.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/footer/PaymentMarks.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/footer/FooterNewsletterForm.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(footer, />Company</);
  assert.match(footer, />Travel services</);
  assert.match(footer, />Partners and policies</);
  assert.match(footer, />Stay informed</);
  assert.match(footer, /Chat on WhatsApp/);
  assert.match(footer, /FooterNewsletterForm/);
  assert.match(footer, /PaymentMarks/);
  assert.match(footer, /SecureWebsiteMark/);
  for (const payment of ['Visa', 'Mastercard', 'American Express', 'RuPay', 'UPI', 'PayPal']) {
    assert.match(payments, new RegExp(payment));
  }
  assert.match(newsletter, /\/api\/v1\/newsletter-subscriptions/);
});

test('mailing-list subscriptions normalize valid email and reject invalid input', () => {
  assert.deepEqual(normalizeNewsletterSubscription({ email: ' TRAVEL@EXAMPLE.COM ' }), {
    data: { email: 'travel@example.com' },
    ok: true,
  });
  assert.equal(normalizeNewsletterSubscription({ email: 'not-an-email' }).ok, false);
});

test('mailing-list endpoint is same-origin, bounded, rate-limited, and persistent', async () => {
  const route = await readFile(
    new URL('../app/api/v1/newsletter-subscriptions/route.ts', import.meta.url),
    'utf8',
  );

  assert.match(route, /isSameOriginMutation/);
  assert.match(route, /PUBLIC_NEWSLETTER_BODY_LIMIT_BYTES/);
  assert.match(route, /PUBLIC_NEWSLETTER_SUBSCRIBE/);
  assert.match(route, /newsletterSubscription\.upsert/);
});
