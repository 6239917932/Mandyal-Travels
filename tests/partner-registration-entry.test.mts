import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('partner sign-in preserves a secure application path for new suppliers', async () => {
  const authForm = await readFile(
    new URL('../components/auth/AuthForm.tsx', import.meta.url),
    'utf8',
  );

  assert.match(authForm, /returnTo === '\/partner'/);
  assert.match(authForm, /returnTo\?\.startsWith\('\/partner\/'\)/);
  assert.match(authForm, /encodeURIComponent\('\/partners\/apply'\)/);
  assert.match(authForm, /Apply as a hotel or car partner/);
  assert.doesNotMatch(authForm, /accountType=['"]partner['"]/);
});

test('unapproved accounts are sent to supplier application instead of partner operations', async () => {
  const [layout, page] = await Promise.all([
    readFile(new URL('../app/partner/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/page.tsx', import.meta.url), 'utf8'),
  ]);

  for (const source of [layout, page]) {
    assert.match(
      source,
      /if \(!access\?\.partnerId \|\| !access\.userId\) redirect\('\/partners\/apply'\)/,
    );
  }
});
