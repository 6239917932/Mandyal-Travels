import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createHotelDiscoveryExplanationPayload,
  HOTEL_DISCOVERY_EXPLANATION_MAX_LENGTH,
  readHotelDiscoveryExplanationPayload,
} from '../services/hotelDiscoveryExplanationRules.ts';

const now = Date.UTC(2026, 7, 24, 12);

test('guided explanation is normalized, destination-bound, and time-bound', () => {
  const raw = createHotelDiscoveryExplanationPayload({
    createdAt: now - 1_000,
    destination: ' Jaipur ',
    explanation: ' Applied   parking and refundable rates. ',
  });
  assert.ok(raw);
  assert.equal(
    readHotelDiscoveryExplanationPayload(raw, 'Jaipur', String(now - 1_000), now),
    'Applied parking and refundable rates.',
  );
  assert.equal(readHotelDiscoveryExplanationPayload(raw, 'Shimla', String(now - 1_000), now), null);
  assert.equal(readHotelDiscoveryExplanationPayload(raw, 'Jaipur', String(now), now), null);
  assert.equal(
    readHotelDiscoveryExplanationPayload(raw, 'Jaipur', String(now - 1_000), now + 6 * 60 * 1000),
    null,
  );
});

test('malformed, future, raw legacy, and unbounded values fail closed', () => {
  assert.equal(readHotelDiscoveryExplanationPayload('not-json', 'Jaipur', String(now), now), null);
  assert.equal(
    readHotelDiscoveryExplanationPayload('Legacy explanation', 'Jaipur', String(now), now),
    null,
  );
  assert.equal(
    createHotelDiscoveryExplanationPayload({
      createdAt: now,
      destination: 'Jaipur',
      explanation: 'x'.repeat(HOTEL_DISCOVERY_EXPLANATION_MAX_LENGTH + 1),
    }),
    null,
  );
  const future = createHotelDiscoveryExplanationPayload({
    createdAt: now + 60_000,
    destination: 'Jaipur',
    explanation: 'Applied Jaipur.',
  });
  assert.ok(future);
  assert.equal(
    readHotelDiscoveryExplanationPayload(future, 'Jaipur', String(now + 60_000), now),
    null,
  );
});

test('customer display consumes storage once and keeps search authority explicit', async () => {
  const [assistant, display, page] = await Promise.all([
    readFile(new URL('../components/hotel/HotelDiscoveryAssistant.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/hotel/HotelDiscoveryExplanation.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/hotels/page.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(assistant, /createHotelDiscoveryExplanationPayload/);
  assert.match(display, /sessionStorage\.removeItem/);
  assert.match(display, /Guided filter explanation/i);
  assert.match(display, /Inventory, availability, policies, and\s+final prices always come from/);
  assert.match(display, /Dismiss guided filter explanation/);
  assert.match(page, /requestToken=\{first\(rawSearchParams\.guidedAt\)\}/);
  assert.doesNotMatch(display, /provider|Cashfree|fetch\(|method=|<form/);
});
