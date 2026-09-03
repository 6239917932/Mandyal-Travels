import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createHotelbedsSignature,
  hotelbedsApiOrigin,
  hotelbedsMutualTlsOrigin,
  inspectHotelbedsConfiguration,
  readHotelbedsConfiguration,
} from '../lib/hotel/hotelbedsRules.ts';
import { HotelbedsEvaluationAdapter } from '../repositories/hotelbedsEvaluationAdapter.ts';

test('Hotelbeds connector is disabled by default and never treats placeholders as credentials', () => {
  assert.equal(readHotelbedsConfiguration({}), undefined);
  assert.deepEqual(
    inspectHotelbedsConfiguration({
      HOTELBEDS_API_KEY: 'replace-with-key',
      HOTELBEDS_SECRET: 'example-secret',
    }),
    {
      configured: false,
      enabled: false,
      environment: 'evaluation',
      mutualTlsConfigured: false,
      productionBlocked: false,
    },
  );
});

test('Hotelbeds evaluation access fails closed in production', () => {
  assert.throws(
    () =>
      readHotelbedsConfiguration({
        HOTELBEDS_API_KEY: 'valid-api-key',
        HOTELBEDS_ENABLED: 'true',
        HOTELBEDS_ENVIRONMENT: 'evaluation',
        HOTELBEDS_SECRET: 'valid-secret',
        NODE_ENV: 'production',
      }),
    /cannot be enabled in production/,
  );
  assert.deepEqual(
    readHotelbedsConfiguration({
      HOTELBEDS_API_KEY: 'valid-api-key',
      HOTELBEDS_ENABLED: 'true',
      HOTELBEDS_ENVIRONMENT: 'production',
      HOTELBEDS_SECRET: 'valid-secret',
      NODE_ENV: 'production',
    }),
    { apiKey: 'valid-api-key', environment: 'production', secret: 'valid-secret' },
  );
});

test('Hotelbeds endpoints are fixed and signatures follow the documented digest contract', () => {
  assert.equal(hotelbedsApiOrigin('evaluation'), 'https://api.test.hotelbeds.com');
  assert.equal(hotelbedsApiOrigin('production'), 'https://api.hotelbeds.com');
  assert.equal(hotelbedsMutualTlsOrigin('evaluation'), 'https://api-mtls.test.hotelbeds.com');
  assert.equal(hotelbedsMutualTlsOrigin('production'), 'https://api-mtls.hotelbeds.com');
  const expected = createHash('sha256').update('keysecret1724841000').digest('hex');
  assert.equal(
    createHotelbedsSignature({ apiKey: 'key', secret: 'secret' }, 1_724_841_000),
    expected,
  );
  assert.throws(
    () => createHotelbedsSignature({ apiKey: 'key', secret: 'secret' }, 0),
    /positive epoch second/,
  );
});

test('Hotelbeds evaluation verifier makes one signed status request and exposes no secret', async () => {
  const requests: Array<{ headers: Headers; method: string | undefined; url: string }> = [];
  const providerFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      headers: new Headers(init?.headers),
      method: init?.method,
      url: String(input),
    });
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  const adapter = new HotelbedsEvaluationAdapter(
    { apiKey: 'key', environment: 'evaluation', secret: 'secret' },
    providerFetch,
    () => 1_724_841_000_000,
  );

  assert.deepEqual(await adapter.verifyStatus(), {
    environment: 'evaluation',
    reachable: true,
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.url, 'https://api.test.hotelbeds.com/hotel-api/1.0/status');
  assert.equal(requests[0]?.method, 'GET');
  assert.equal(requests[0]?.headers.get('Api-key'), 'key');
  assert.equal(
    requests[0]?.headers.get('X-Signature'),
    createHotelbedsSignature({ apiKey: 'key', secret: 'secret' }, 1_724_841_000),
  );
  assert.equal(JSON.stringify(requests).includes('secret'), false);
});

test('Hotelbeds readiness is administrator-only and cannot activate customer inventory', async () => {
  const [page, adapter, script] = await Promise.all([
    readFile('app/admin/integrations/hotelbeds/page.tsx', 'utf8'),
    readFile('repositories/hotelbedsEvaluationAdapter.ts', 'utf8'),
    readFile('scripts/verify-hotelbeds-evaluation.mjs', 'utf8'),
  ]);
  assert.match(page, /getPlatformAdmin/);
  assert.match(page, /Customer booking[\s\S]*Blocked/);
  assert.match(page, /Mutual TLS[\s\S]*mutualTlsConfigured/);
  assert.match(page, /never mixed into public hotel results/);
  assert.doesNotMatch(page, /HOTELBEDS_SECRET/);
  assert.match(adapter, /\/hotel-api\/1\.0\/status/);
  assert.match(adapter, /\/hotel-api\/1\.0\/hotels/);
  assert.match(adapter, /\/hotel-api\/1\.0\/checkrates/);
  assert.match(adapter, /Hotelbeds booking operations require an associated mTLS certificate/);
  assert.match(script, /No availability search, booking, cancellation, payment/);
});

test('Hotelbeds mTLS secrets require a certificate and key pair', () => {
  const certificate = Buffer.from(
    '-----BEGIN CERTIFICATE-----\nvalue\n-----END CERTIFICATE-----',
  ).toString('base64');
  assert.throws(
    () =>
      readHotelbedsConfiguration({
        HOTELBEDS_API_KEY: 'valid-api-key',
        HOTELBEDS_ENABLED: 'true',
        HOTELBEDS_ENVIRONMENT: 'evaluation',
        HOTELBEDS_MTLS_CERT_BASE64: certificate,
        HOTELBEDS_SECRET: 'valid-secret',
      }),
    /both a client certificate and private key/,
  );
});
