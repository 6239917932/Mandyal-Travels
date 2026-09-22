import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('booking documents wrap long operational references on narrow screens', async () => {
  const styles = await readFile(new URL('../styles/hotel.css', import.meta.url), 'utf8');

  assert.match(styles, /\.booking-document-page\s*\{[\s\S]*?min-width:\s*0;/);
  assert.match(styles, /\.booking-document-page\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
  assert.match(
    styles,
    /\.booking-document__charges\s*>\s*div\s*>\s*\*[\s\S]*?overflow-wrap:\s*anywhere;/,
  );
});
