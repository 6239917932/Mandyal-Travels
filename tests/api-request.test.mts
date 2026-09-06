import assert from 'node:assert/strict';
import test from 'node:test';

import { isSameOriginMutation, readJsonObject, readTextBody } from '../lib/api/request.ts';

test('bounded request helpers accept valid bodies', async () => {
  const json = await readJsonObject(
    new Request('https://portal.example.com/api', {
      method: 'POST',
      body: JSON.stringify({ hotel: 'Mandyal Homestay' }),
      headers: { 'content-type': 'application/json' },
    }),
  );
  assert.deepEqual(json, { hotel: 'Mandyal Homestay' });

  const text = await readTextBody(
    new Request('https://portal.example.com/webhook', { method: 'POST', body: 'event' }),
    5,
  );
  assert.equal(text, 'event');
});

test('bounded request helpers reject declared and streamed oversized bodies', async () => {
  const declaredOversize = new Request('https://portal.example.com/api', {
    method: 'POST',
    body: '{}',
    headers: { 'content-length': '100' },
  });
  assert.equal(await readJsonObject(declaredOversize, 10), null);

  const streamedOversize = new Request('https://portal.example.com/webhook', {
    method: 'POST',
    body: '123456',
  });
  assert.equal(await readTextBody(streamedOversize, 5), null);
});

test('JSON request parsing rejects explicitly incorrect media types', async () => {
  const request = new Request('https://portal.example.com/api', {
    method: 'POST',
    body: '{}',
    headers: { 'content-type': 'text/plain' },
  });
  assert.equal(await readJsonObject(request), null);
});

test('same-origin mutation guard rejects cross-site and mismatched origins', () => {
  assert.equal(
    isSameOriginMutation(
      new Request('https://portal.example.com/api', {
        headers: { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' },
      }),
    ),
    false,
  );
  assert.equal(
    isSameOriginMutation(
      new Request('https://portal.example.com/api', {
        headers: { origin: 'https://other.example' },
      }),
    ),
    false,
  );
  assert.equal(
    isSameOriginMutation(
      new Request('https://portal.example.com/api', {
        headers: { origin: 'https://portal.example.com' },
      }),
    ),
    true,
  );
  assert.equal(isSameOriginMutation(new Request('https://portal.example.com/api')), false);
  assert.equal(
    isSameOriginMutation(
      new Request('https://portal.example.com/api', {
        headers: { 'sec-fetch-site': 'same-site' },
      }),
    ),
    false,
  );
  assert.equal(
    isSameOriginMutation(
      new Request('https://portal.example.com/api', {
        headers: { 'sec-fetch-site': 'same-origin' },
      }),
    ),
    true,
  );
});

test('same-origin mutation guard accepts official apex and www hosts behind a reverse proxy', () => {
  const previousOrigin = process.env.PUBLIC_APP_ORIGIN;
  process.env.PUBLIC_APP_ORIGIN = 'https://www.mandyaltravels.com';

  try {
    for (const origin of ['https://mandyaltravels.com', 'https://www.mandyaltravels.com']) {
      assert.equal(
        isSameOriginMutation(
          new Request('https://mandyal-travels.onrender.com/api/v1/partners/applications', {
            method: 'POST',
            headers: { origin, 'sec-fetch-site': 'same-site' },
          }),
        ),
        true,
      );
    }
  } finally {
    if (previousOrigin === undefined) delete process.env.PUBLIC_APP_ORIGIN;
    else process.env.PUBLIC_APP_ORIGIN = previousOrigin;
  }
});
