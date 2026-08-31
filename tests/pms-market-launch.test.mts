import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { siteConfig } from '../config/site.ts';
import { normalizePublicContactInquiry } from '../services/publicContactInquiryRules.ts';

test('public navigation removes duplicate product links while the footer preserves launch order', () => {
  assert.deepEqual(
    siteConfig.navigation.map((item) => item.label),
    [
      'Home',
      'Trip planner',
      'Destinations',
      'Offers',
      'Business',
      'Partners',
      'Manage booking',
      'Contact us',
    ],
  );
  assert.deepEqual(
    siteConfig.footerNavigation.slice(0, 4).map((item) => item.label),
    ['Hotels', 'Cars', 'Flights — coming soon', 'Buses — coming soon'],
  );
});

test('home widget launches hotels and cars first and labels flight and bus honestly', async () => {
  const widget = await readFile(
    new URL('../components/home/HomeBookingWidget.tsx', import.meta.url),
    'utf8',
  );
  assert.match(widget, /available: true, href: '\/hotels'/);
  assert.match(widget, /available: true, href: '\/cars'/);
  assert.match(widget, /available: false, href: '\/flights'/);
  assert.match(widget, /available: false, href: '\/buses'/);
  assert.match(widget, /No demonstration fare will be presented as live inventory/);
});

test('hotel and car owner creation routes enforce partner roles and invoke real operations', async () => {
  const [properties, vehicles] = await Promise.all([
    readFile(new URL('../app/api/v1/partner/properties/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/v1/partner/vehicles/route.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(properties, /partnerType !== 'HOTEL'/);
  assert.match(properties, /memberRole !== 'ADMIN'/);
  assert.match(properties, /partnerOperationsService\.createProperty/);
  assert.match(properties, /status: 201/);
  assert.match(vehicles, /partnerType !== 'CAR'/);
  assert.match(vehicles, /memberRole !== 'ADMIN'/);
  assert.match(vehicles, /partnerOperationsService\.createVehicle/);
  assert.match(vehicles, /status: 201/);
});

test('public inquiries normalize valid owner leads and reject unsafe input', () => {
  assert.deepEqual(
    normalizePublicContactInquiry({
      category: 'hotel_owner',
      email: ' OWNER@EXAMPLE.COM ',
      message: 'I want to list my property in Bir.',
      name: ' Jasveer Singh ',
      phone: '+91 80693 77940',
    }),
    {
      data: {
        category: 'HOTEL_OWNER',
        email: 'owner@example.com',
        message: 'I want to list my property in Bir.',
        name: 'Jasveer Singh',
        phone: '+91 80693 77940',
      },
      ok: true,
    },
  );
  const invalid = normalizePublicContactInquiry({
    category: 'UNKNOWN',
    email: 'not-an-email',
    message: 'short',
    name: 'x',
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.match(invalid.error, /name/i);
});
