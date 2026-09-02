import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import test from 'node:test';

import sharp from 'sharp';

import manifest from '../app/manifest.ts';

test('mobile web manifest provides install-safe branded metadata', () => {
  const value = manifest();

  assert.equal(value.id, '/');
  assert.equal(value.scope, '/');
  assert.equal(value.start_url, '/');
  assert.equal(value.display, 'standalone');
  assert.equal(value.theme_color, '#0c3157');
  assert.equal(value.background_color, '#f7f9fc');
  assert.equal(value.lang, 'en-IN');
  assert.ok(value.icons?.some((icon) => icon.sizes === '192x192'));
  assert.ok(value.icons?.some((icon) => icon.sizes === '512x512'));
  assert.ok(value.icons?.some((icon) => icon.purpose === 'maskable'));
  assert.ok(
    value.icons?.every((icon) => icon.src.includes('mandyal-signature')),
    'installed app icons should use the approved Mandyal Travels signature artwork',
  );
});

test('all declared mobile web icons exist and contain image data', () => {
  const value = manifest();

  for (const icon of value.icons ?? []) {
    const path = `public${icon.src}`;
    assert.ok(statSync(path).size > 1_000, `${path} should contain a rendered icon`);
  }

  assert.ok(
    statSync('public/brand/mandyal-signature-apple-touch-v3.png').size > 1_000,
    'Apple touch icon should contain a rendered icon',
  );
});

test('installed app icons use the wide signature on white without the old navy tile', async () => {
  const icons = [
    ['public/brand/mandyal-signature-app-icon-v3-192.png', 192, 0.9],
    ['public/brand/mandyal-signature-app-icon-v3-512.png', 512, 0.9],
    ['public/brand/mandyal-signature-apple-touch-v3.png', 180, 0.9],
    ['public/brand/mandyal-signature-maskable-v3-512.png', 512, 0.72],
  ] as const;

  for (const [path, size, minimumContentWidth] of icons) {
    const image = sharp(path);
    const metadata = await image.metadata();
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);

    const { data, info } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const corner = [data[0], data[1], data[2]];
    assert.ok(
      corner.every((channel) => channel >= 248),
      `${path} should have a white background`,
    );

    let minimumX = info.width;
    let maximumX = -1;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const offset = (y * info.width + x) * info.channels;
        if (data[offset] < 242 || data[offset + 1] < 242 || data[offset + 2] < 242) {
          minimumX = Math.min(minimumX, x);
          maximumX = Math.max(maximumX, x);
        }
      }
    }
    assert.ok((maximumX - minimumX + 1) / size >= minimumContentWidth);
  }
});

test('mobile install readiness does not register an offline service worker', () => {
  assert.throws(() => statSync('public/service-worker.js'));
  assert.throws(() => statSync('public/sw.js'));
});

test('installed mobile experience exposes only safe customer shortcuts', () => {
  const shortcuts = manifest().shortcuts ?? [];

  assert.deepEqual(
    shortcuts.map((shortcut) => shortcut.url),
    ['/hotels', '/cars', '/trip-planner', '/manage-booking'],
  );
  assert.ok(shortcuts.every((shortcut) => shortcut.name && shortcut.short_name));
  assert.ok(shortcuts.every((shortcut) => shortcut.url.startsWith('/')));
  assert.ok(shortcuts.every((shortcut) => !shortcut.url.startsWith('/admin')));
  assert.ok(shortcuts.every((shortcut) => !shortcut.url.startsWith('/partner')));
  assert.ok(shortcuts.every((shortcut) => !['/flights', '/buses'].includes(shortcut.url)));
});
