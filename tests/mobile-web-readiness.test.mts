import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import test from 'node:test';

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
    statSync('public/brand/mandyal-signature-apple-touch-v2.png').size > 1_000,
    'Apple touch icon should contain a rendered icon',
  );
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
