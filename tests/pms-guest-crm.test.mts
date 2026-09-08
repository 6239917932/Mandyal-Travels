import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  GUEST_CRM_MAX_BOOKINGS,
  GUEST_CRM_MAX_PROFILES,
  GUEST_CRM_MAX_PROPERTIES,
  GUEST_CRM_MAX_STAYS_PER_PROFILE,
  guestCrmDate,
  guestCrmText,
  guestRecognition,
  maskGuestCrmEmail,
  maskGuestCrmPhone,
  normalizeGuestCrmEmail,
} from '../lib/pms/guestCrm.ts';

const root = new URL('../', import.meta.url);
const source = (path: string) => readFile(new URL(path, root), 'utf8');

test('guest CRM contact projection normalizes and masks identifiers', () => {
  assert.equal(normalizeGuestCrmEmail(' Guest@Example.COM '), 'guest@example.com');
  assert.equal(normalizeGuestCrmEmail('not-an-email'), null);
  assert.equal(maskGuestCrmEmail('guest@example.com'), 'g***@example.com');
  assert.equal(maskGuestCrmPhone('+91 98765 43210'), '•••• 3210');
  assert.equal(maskGuestCrmPhone('12'), 'Phone unavailable');
});

test('guest CRM recognition is deterministic and stored text is bounded', () => {
  assert.equal(guestRecognition(1), 'FIRST_STAY');
  assert.equal(guestRecognition(2), 'RETURNING_GUEST');
  assert.equal(guestRecognition(5), 'FREQUENT_GUEST');
  assert.equal(guestRecognition(Number.NaN), 'FIRST_STAY');
  assert.equal(guestCrmText('  High\n floor\u0000 ', '', 20), 'High floor');
  assert.equal(guestCrmText('abcdef', '', 4), 'abcd');
  assert.equal(guestCrmDate('2026-09-08'), '2026-09-08');
  assert.equal(guestCrmDate('2026-02-31'), 'Date unavailable');
});

test('guest CRM data access is partner scoped, managed-only and absolutely bounded', async () => {
  const service = await source('services/partnerGuestCrmService.ts');
  assert.equal(GUEST_CRM_MAX_PROPERTIES, 100);
  assert.equal(GUEST_CRM_MAX_BOOKINGS, 500);
  assert.equal(GUEST_CRM_MAX_PROFILES, 200);
  assert.equal(GUEST_CRM_MAX_STAYS_PER_PROFILE, 20);
  assert.match(service, /partnerId: input\.partnerId/);
  assert.match(service, /listingSource: 'MANAGED'/);
  assert.match(service, /status: 'confirmed'/);
  assert.match(service, /_count: \{ select: \{ guestRegistrations:/);
  assert.doesNotMatch(service, /guestRegistrations: \{ select: \{ consentRecorded: true \} \}/);
  assert.match(service, /slice\(0, GUEST_CRM_MAX_BOOKINGS\)/);
  assert.match(service, /slice\(0, GUEST_CRM_MAX_PROFILES\)/);
  assert.match(service, /slice\(0, GUEST_CRM_MAX_STAYS_PER_PROFILE\)/);
});

test('guest CRM exposes a minimal read-only DTO and no marketing authority', async () => {
  const [service, page, registry] = await Promise.all([
    source('services/partnerGuestCrmService.ts'),
    source('app/partner/pms/guest-crm/page.tsx'),
    source('lib/pms/moduleRegistry.ts'),
  ]);
  assert.match(service, /import 'server-only'/);
  assert.doesNotMatch(service, /identityLast4/);
  assert.doesNotMatch(service, /referenceFingerprint/);
  assert.doesNotMatch(page, /type="email"|type="tel"|method="post"/i);
  assert.match(page, /operational history, not marketing consent/);
  assert.match(page, /never exposes full\s+identity references/);
  assert.match(registry, /code: 'GC'[\s\S]*href: '\/partner\/pms\/guest-crm'[\s\S]*status: 'LIVE'/);
});
