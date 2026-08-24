import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('brand artwork loads eagerly when the short-page footer can enter the first viewport', () => {
  const logo = readFileSync('components/brand/MandyalLogo.tsx', 'utf8');
  const header = readFileSync('components/layout/SiteHeader.tsx', 'utf8');
  const footer = readFileSync('components/layout/SiteFooter.tsx', 'utf8');
  assert.match(logo, /loading=\{eager \|\| size === 'hero' \? 'eager' : 'lazy'\}/);
  assert.match(header, /<MandyalLogo eager showTagline/);
  assert.match(footer, /<MandyalLogo appearance="inverse" eager showTagline/);
});
