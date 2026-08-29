import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildHotelbedsContentPath,
  parseHotelbedsContentPage,
  planHotelbedsContentSync,
} from '../lib/hotel/hotelbedsContentRules.ts';
import { HotelbedsEvaluationAdapter } from '../repositories/hotelbedsEvaluationAdapter.ts';

test('content pages are bounded to 1,000 and differential dates are normalized', () => {
  assert.equal(
    buildHotelbedsContentPath({
      from: 1,
      lastUpdateTime: new Date('2026-08-28T12:30:00Z'),
      to: 1000,
    }),
    '/hotel-content-api/1.0/hotels?fields=all&from=1&language=ENG&to=1000&lastUpdateTime=2026-08-28',
  );
  assert.throws(() => buildHotelbedsContentPath({ from: 1, to: 1001 }), /at most 1000 hotels/);
  assert.throws(
    () => buildHotelbedsContentPath({ from: 1, language: '../ENG', to: 10 }),
    /Invalid Hotelbeds content language/,
  );
});

test('content parser creates stable hashes and rejects duplicates or malformed codes', () => {
  const first = parseHotelbedsContentPage({
    auditData: { total: 2 },
    hotels: [
      { code: 1067, name: { content: 'Example' }, categoryCode: '4EST' },
      { code: 1070, destinationCode: 'PMI' },
    ],
  });
  const reordered = parseHotelbedsContentPage({
    hotels: [{ categoryCode: '4EST', name: { content: 'Example' }, code: 1067 }],
  });
  assert.equal(first.total, 2);
  assert.equal(first.hotels[0]?.contentHash, reordered.hotels[0]?.contentHash);
  assert.equal(first.hotels[0]?.providerHotelCode, 1067);
  assert.throws(
    () => parseHotelbedsContentPage({ hotels: [{ code: 1 }, { code: 1 }] }),
    /duplicate hotel code/,
  );
  assert.throws(() => parseHotelbedsContentPage({ hotels: [{ code: '1' }] }), /invalid hotel code/);
});

test('partial initial loads resume before differential synchronization begins', () => {
  assert.deepEqual(planHotelbedsContentSync({ cachedCount: 0 }), { from: 1, mode: 'INITIAL' });
  assert.deepEqual(
    planHotelbedsContentSync({
      cachedCount: 5_000,
      lastSuccessfulCompletedAt: new Date('2026-08-28T12:00:00Z'),
      lastSuccessfulSummaryJson: JSON.stringify({ mode: 'INITIAL', nextFrom: 5_001 }),
    }),
    { from: 5_001, mode: 'INITIAL' },
  );
  assert.deepEqual(
    planHotelbedsContentSync({
      cachedCount: 8_000,
      lastSuccessfulCompletedAt: new Date('2026-08-28T12:00:00Z'),
      lastSuccessfulSummaryJson: JSON.stringify({ mode: 'INITIAL' }),
    }),
    {
      from: 1,
      lastUpdateTime: new Date('2026-08-28T12:00:00Z'),
      mode: 'DIFFERENTIAL',
    },
  );
  assert.deepEqual(
    planHotelbedsContentSync({
      cachedCount: 8_000,
      lastSuccessfulCompletedAt: new Date('2026-08-29T12:00:00Z'),
      lastSuccessfulSummaryJson: JSON.stringify({
        differentialDate: '2026-08-28',
        mode: 'DIFFERENTIAL',
        nextFrom: 5_001,
      }),
    }),
    {
      from: 5_001,
      lastUpdateTime: new Date('2026-08-28T00:00:00Z'),
      mode: 'DIFFERENTIAL',
    },
  );
  assert.throws(
    () =>
      planHotelbedsContentSync({
        cachedCount: 1,
        lastSuccessfulCompletedAt: new Date(),
        lastSuccessfulSummaryJson: '{',
      }),
    /Invalid Hotelbeds content sync evidence/,
  );
});

test('content adapter uses the fixed gzip endpoint without booking operations', async () => {
  const requests: Array<{ headers: Headers; method?: string; url: string }> = [];
  const providerFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      headers: new Headers(init?.headers),
      method: init?.method,
      url: String(input),
    });
    return Response.json({ hotels: [{ code: 1067 }] });
  }) as typeof fetch;
  const adapter = new HotelbedsEvaluationAdapter(
    { apiKey: 'key', environment: 'evaluation', secret: 'secret' },
    providerFetch,
    () => 1_724_841_000_000,
  );
  const page = await adapter.fetchContentPage({ from: 1, to: 1000 });
  assert.equal(page.hotels.length, 1);
  assert.match(requests[0]?.url ?? '', /hotel-content-api\/1\.0\/hotels/);
  assert.equal(requests[0]?.method, 'GET');
  assert.equal(requests[0]?.headers.get('Accept-Encoding'), 'gzip');
});

test('content worker is private, fail-closed, and disconnected from public search', async () => {
  const [route, worker, readiness, hotelsPage, schema] = await Promise.all([
    readFile('app/api/v1/internal/workers/hotelbeds-content/route.ts', 'utf8'),
    readFile('services/hotelbedsContentAutomationService.ts', 'utf8'),
    readFile('lib/hotel/hotelbedsContentReadiness.ts', 'utf8'),
    readFile('app/hotels/page.tsx', 'utf8'),
    readFile('prisma/schema.prisma', 'utf8'),
  ]);
  assert.match(route, /AUTOPILOT_WORKER_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(worker, /HOTELBEDS_CONTENT_SYNC_ENABLED/);
  assert.match(worker, /HOTELBEDS_CONTENT_JOB_KEY/);
  assert.match(readiness, /HOTELBEDS_CONTENT_CACHE_V1/);
  assert.doesNotMatch(worker, /checkRates|searchAvailability|bookings|cancellations/);
  assert.doesNotMatch(hotelsPage, /HotelbedsContentProperty|hotelbedsContentProperty/);
  assert.match(schema, /model HotelbedsContentProperty/);
});
